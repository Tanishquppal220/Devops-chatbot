"""AST-based codebase analyzer.

Recursively scans a project directory, extracts structural information
from source files using Python's ast module (for .py) and raw content
for other languages, and builds a context string for the LLM.
"""

import ast
import os
from pathlib import Path
from typing import Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS: set[str] = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java",
    ".rs", ".rb", ".php", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".swift", ".kt",
}

DEPENDENCY_FILES: set[str] = {
    "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg",
    "Pipfile", "package.json", "go.mod", "Cargo.toml",
    "Gemfile", "composer.json", "pom.xml", "build.gradle",
}

CONFIG_FILES: set[str] = {
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".dockerignore", ".gitignore", ".env.example",
    "tsconfig.json", "webpack.config.js", "vite.config.ts",
    "vite.config.js", "next.config.js", "next.config.mjs",
}

IGNORE_DIRS: set[str] = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    ".next", "dist", "build", ".tox", ".mypy_cache",
    ".pytest_cache", "target", "vendor", ".eggs", "egg-info",
}

MAX_FILE_SIZE = 50_000  # characters per file
MAX_TOTAL_CONTEXT = 200_000  # total characters for the entire context


# ---------------------------------------------------------------------------
# Python AST Analyzer
# ---------------------------------------------------------------------------

class PythonFileAnalyzer(ast.NodeVisitor):
    """Extract classes, functions, and imports from a Python file."""

    def __init__(self) -> None:
        self.classes: list[dict] = []
        self.functions: list[dict] = []
        self.imports: list[str] = []
        self._in_class: bool = False

    # -- helpers --------------------------------------------------------

    @staticmethod
    def _node_name(node: ast.expr) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return f"{PythonFileAnalyzer._node_name(node.value)}.{node.attr}"
        return "?"

    # -- visitors -------------------------------------------------------

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        bases = [self._node_name(b) for b in node.bases]
        methods = [
            n.name
            for n in node.body
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        ]
        self.classes.append(
            {"name": node.name, "bases": bases, "methods": methods, "line": node.lineno}
        )
        prev = self._in_class
        self._in_class = True
        self.generic_visit(node)
        self._in_class = prev

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if self._in_class:
            self.generic_visit(node)
            return
        args = [a.arg for a in node.args.args]
        decorators: list[str] = []
        for d in node.decorator_list:
            if isinstance(d, ast.Name):
                decorators.append(d.id)
            elif isinstance(d, ast.Attribute):
                decorators.append(f"{self._node_name(d.value)}.{d.attr}")
        self.functions.append(
            {
                "name": node.name,
                "args": args,
                "decorators": decorators,
                "line": node.lineno,
                "is_async": isinstance(node, ast.AsyncFunctionDef),
            }
        )
        self.generic_visit(node)

    visit_AsyncFunctionDef = visit_FunctionDef  # type: ignore[assignment]

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            self.imports.append(alias.name)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module:
            names = [alias.name for alias in node.names]
            self.imports.append(f"from {node.module} import {', '.join(names)}")


def analyze_python_file(content: str) -> str:
    """Return a structured summary of a Python file via AST parsing."""
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return "  (syntax error — could not parse)"

    a = PythonFileAnalyzer()
    a.visit(tree)

    parts: list[str] = []
    if a.imports:
        parts.append(f"  Imports: {'; '.join(a.imports[:20])}")
    for cls in a.classes:
        bases = f"({', '.join(cls['bases'])})" if cls["bases"] else ""
        meths = ", ".join(cls["methods"][:10])
        parts.append(f"  Class {cls['name']}{bases} [L{cls['line']}]: methods=[{meths}]")
    for fn in a.functions:
        prefix = "async " if fn.get("is_async") else ""
        decs = f" @{','.join(fn['decorators'])}" if fn["decorators"] else ""
        parts.append(f"  {prefix}def {fn['name']}({', '.join(fn['args'])}){decs} [L{fn['line']}]")
    return "\n".join(parts) if parts else "  (empty or only constants)"


# ---------------------------------------------------------------------------
# Generic (non-Python) file summary
# ---------------------------------------------------------------------------

def _truncate(content: str, max_lines: int = 60) -> str:
    lines = content.split("\n")
    if len(lines) > max_lines:
        return "\n".join(lines[:max_lines]) + f"\n  ... ({len(lines) - max_lines} more lines)"
    return content


# ---------------------------------------------------------------------------
# Main entry-point
# ---------------------------------------------------------------------------

def analyze_codebase(codebase_path: str) -> Tuple[str, int]:
    """Recursively analyze a codebase directory.

    Returns:
        (context_string, files_analyzed_count)
    """
    root = Path(codebase_path)
    if not root.is_dir():
        return f"Error: '{codebase_path}' is not a valid directory.", 0

    sections: list[str] = []
    file_count = 0
    total_chars = 0

    # ── 1. File tree ──────────────────────────────────────────────────
    tree_lines = ["## Project Structure"]
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORE_DIRS)
        rel = os.path.relpath(dirpath, root)
        depth = 0 if rel == "." else rel.count(os.sep) + 1
        indent = "  " * depth
        name = os.path.basename(dirpath) if rel != "." else root.name
        tree_lines.append(f"{indent}{name}/")
        for fn in sorted(filenames):
            tree_lines.append(f"{indent}  {fn}")
    sections.append("\n".join(tree_lines[:120]))

    # ── 2. Dependency / config files ──────────────────────────────────
    dep_lines = ["## Dependency & Config Files"]
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fn in sorted(filenames):
            if fn not in DEPENDENCY_FILES and fn not in CONFIG_FILES:
                continue
            fp = os.path.join(dirpath, fn)
            rel = os.path.relpath(fp, root)
            try:
                text = Path(fp).read_text(errors="ignore")[:MAX_FILE_SIZE]
                dep_lines.append(f"\n### {rel}\n```\n{text}\n```")
                total_chars += len(text)
            except Exception:
                dep_lines.append(f"\n### {rel}\n(could not read)")
    if len(dep_lines) > 1:
        sections.append("\n".join(dep_lines))

    # ── 3. Source code analysis ───────────────────────────────────────
    src_lines = ["## Source Code Analysis"]
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fn in sorted(filenames):
            ext = os.path.splitext(fn)[1].lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            if total_chars >= MAX_TOTAL_CONTEXT:
                src_lines.append(
                    f"\n... (context limit reached after {file_count} files)"
                )
                break

            fp = os.path.join(dirpath, fn)
            rel = os.path.relpath(fp, root)
            try:
                content = Path(fp).read_text(errors="ignore")
                if len(content) > MAX_FILE_SIZE:
                    content = content[:MAX_FILE_SIZE] + "\n... (truncated)"

                file_count += 1
                total_chars += len(content)

                if ext == ".py":
                    src_lines.append(f"\n### {rel} (Python)")
                    src_lines.append(analyze_python_file(content))
                    if len(content) < 5000:
                        src_lines.append(f"```python\n{content}\n```")
                else:
                    src_lines.append(f"\n### {rel}")
                    src_lines.append(f"```\n{_truncate(content)}\n```")
            except Exception as exc:
                src_lines.append(f"\n### {rel}\n(error: {exc})")

    sections.append("\n".join(src_lines))
    return "\n\n".join(sections), file_count
