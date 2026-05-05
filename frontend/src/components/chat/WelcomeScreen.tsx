/** Welcome screen shown when no conversation is active. */

import { Terminal, FileCode2, TestTube, Package, ShieldCheck } from 'lucide-react';

interface WelcomeScreenProps {
  onPrompt: (prompt: string) => void;
}

const SUGGESTIONS = [
  {
    icon: FileCode2,
    label: 'Dockerfile',
    prompt: 'Generate an optimized Dockerfile for this project',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: TestTube,
    label: 'Test Cases',
    prompt: 'Write comprehensive test cases for this codebase',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Package,
    label: 'Bundle Size',
    prompt: 'Analyze and optimize the bundle size',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: ShieldCheck,
    label: 'Production Readiness',
    prompt: 'Analyze this codebase for production readiness',
    color: 'from-emerald-500 to-teal-500',
  },
];

export default function WelcomeScreen({ onPrompt }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 md:px-6 py-6 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-8 md:mb-10 max-w-xl">
        <div className="size-16 border-2 border-[var(--neo-ink)] rounded-[4px] bg-[var(--neo-primary)] flex items-center justify-center mx-auto mb-5 shadow-[6px_6px_0_color-mix(in_oklab,var(--neo-primary)_44%,var(--neo-ink)_56%)]">
          <Terminal className="size-7 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase mb-2">
          What can I help you build?
        </h2>
        <p className="text-[var(--neo-ink-soft)] text-sm">
          I'm your AI DevOps assistant. I can generate Dockerfiles, write test cases,
          optimize bundle sizes, and assess production readiness.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            id={`suggestion-${s.label.toLowerCase().replace(/\s/g, '-')}`}
            className={`
              group relative overflow-hidden neo-btn text-left p-4
              bg-[var(--neo-bg)]
              hover:-translate-x-0.5 hover:-translate-y-0.5
            `}
            onClick={() => onPrompt(s.prompt)}
          >
            <div
              className={`
              size-9 border-2 border-[var(--neo-ink)] rounded-[4px] bg-linear-to-br ${s.color}
              flex items-center justify-center mb-3
              shadow-[3px_3px_0_color-mix(in_oklab,var(--neo-ink)_52%,transparent)]
              group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform duration-150
            `}
            >
              <s.icon className="size-4 text-white" />
            </div>
            <p className="font-semibold text-sm uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-[11px] text-[var(--neo-ink-soft)] leading-relaxed line-clamp-2">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>

      {/* Subtle hint */}
      <p className="text-[11px] text-[var(--neo-ink-soft)] mt-8 font-mono uppercase tracking-wide">
        Type a message below or click a suggestion to get started
      </p>
    </div>
  );
}
