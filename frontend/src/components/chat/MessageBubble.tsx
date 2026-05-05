/** Individual chat message bubble with markdown rendering. */

import { isValidElement, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, FileCode2, TestTube, Package, ShieldCheck, Copy, Check } from 'lucide-react';
import type { Message } from '../../types/chat';

interface MessageBubbleProps {
  message: Message;
}

const AGENT_META: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  general: { icon: Bot, color: 'bg-[var(--neo-primary)]', label: 'General DevOps Assistant' },
  dockerfile: { icon: FileCode2, color: 'bg-sky-600', label: 'Dockerfile Agent' },
  testcase: { icon: TestTube, color: 'bg-fuchsia-600', label: 'Test Case Agent' },
  bundlesize: { icon: Package, color: 'bg-amber-600', label: 'Bundle Size Agent' },
  production: {
    icon: ShieldCheck,
    color: 'bg-emerald-600',
    label: 'Production Readiness',
  },
};

function normalizeMarkdownContent(content: string): string {
  if (!content) return '';

  const normalizedNewlines = content.replace(/\r\n?/g, '\n');
  const escapedNewlineCount = (normalizedNewlines.match(/\\n/g) ?? []).length;
  const realNewlineCount = (normalizedNewlines.match(/\n/g) ?? []).length;
  const shouldUnescape =
    escapedNewlineCount >= 2 &&
    escapedNewlineCount > realNewlineCount &&
    /\\n|\\t|\\`{3}/.test(normalizedNewlines);

  return (shouldUnescape
    ? normalizedNewlines
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\`/g, '`')
    : normalizedNewlines
  ).trimEnd();
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const agentInfo = message.agent ? AGENT_META[message.agent] : null;
  const AgentIcon = agentInfo?.icon ?? Bot;
  const [copied, setCopied] = useState(false);

  const normalizedContent = useMemo(
    () => normalizeMarkdownContent(message.content ?? ''),
    [message.content],
  );

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(normalizedContent);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`flex gap-3 px-2 py-2 animate-message-in ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div
          className={`
            size-8 shrink-0 flex items-center justify-center border-2 border-[var(--neo-ink)] rounded-[4px] shadow-[3px_3px_0_color-mix(in_oklab,var(--neo-ink)_52%,transparent)]
            ${
              agentInfo
                ? `${agentInfo.color}`
                : 'bg-[var(--neo-primary)]'
            }
          `}
        >
          <AgentIcon className="size-4 text-white" />
        </div>
      )}

      <div
        className={`
          max-w-[min(92%,78ch)] px-4 py-3 text-sm leading-relaxed border-2 rounded-[4px]
          ${
            isUser
              ? 'bg-[color:color-mix(in_oklab,var(--neo-primary)_90%,#fff_10%)] text-white border-[var(--neo-ink)] shadow-[6px_6px_0_color-mix(in_oklab,var(--neo-primary)_45%,var(--neo-ink)_55%)]'
              : 'bg-[var(--neo-bg-soft)] border-[var(--neo-ink)] shadow-[5px_5px_0_color-mix(in_oklab,var(--neo-ink)_45%,transparent)]'
          }
        `}
      >
        {!isUser && message.progressSteps && message.progressSteps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {message.progressSteps.map((step, i) => (
              <span
                key={i}
                className="neo-chip"
              >
                {step.label}
              </span>
            ))}
          </div>
        )}

        {!isUser && agentInfo && !message.isStreaming && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className={`inline-flex items-center h-5 px-2 text-[9px] font-semibold uppercase tracking-wide text-white border-2 border-[var(--neo-ink)] rounded-[4px] ${agentInfo.color}`}
            >
              {agentInfo.label}
            </span>
            {message.filesAnalyzed !== undefined && message.filesAnalyzed > 0 && (
              <span className="text-[10px] text-[var(--neo-ink-soft)] font-medium uppercase">
                {message.filesAnalyzed} files analyzed
              </span>
            )}
          </div>
        )}

        {!isUser && normalizedContent && (
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              onClick={copyMessage}
              className="neo-btn h-6 px-2 text-[10px] uppercase tracking-wide flex items-center gap-1.5"
              aria-label="Copy message"
              title="Copy message"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {isUser ? (
          <p>{message.content}</p>
        ) : normalizedContent ? (
          <div className="chat-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                pre({ children }) {
                  if (!isValidElement(children)) {
                    return <pre>{children}</pre>;
                  }

                  const codeElement = children as ReactElement<{
                    className?: string;
                    children?: ReactNode;
                  }>;
                  const className = codeElement.props.className ?? '';
                  const language = className.replace('language-', '').trim() || 'text';
                  const codeValue = String(codeElement.props.children ?? '').replace(/\n$/, '');

                  const copyCodeBlock = async () => {
                    try {
                      await navigator.clipboard.writeText(codeValue);
                    } catch {
                      // noop: keep UI stable if clipboard blocked
                    }
                  };

                  return (
                    <div className="chat-code-block">
                      <div className="chat-code-block__header">
                        <span className="chat-code-block__lang">{language}</span>
                        <button
                          type="button"
                          onClick={copyCodeBlock}
                          className="chat-code-block__copy"
                          aria-label={`Copy ${language} code`}
                          title="Copy code"
                        >
                          Copy
                        </button>
                      </div>
                      <pre>
                        <code className={className}>{codeValue}</code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {normalizedContent}
            </ReactMarkdown>
          </div>
        ) : null}

        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-[var(--neo-accent)] animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>

      {isUser && (
        <div className="size-8 shrink-0 flex items-center justify-center bg-[var(--neo-accent)] border-2 border-[var(--neo-ink)] rounded-[4px] shadow-[3px_3px_0_color-mix(in_oklab,var(--neo-ink)_52%,transparent)]">
          <User className="size-4 text-[var(--neo-ink)]" />
        </div>
      )}
    </div>
  );
}
