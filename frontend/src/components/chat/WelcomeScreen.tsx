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
    shadow: 'shadow-blue-500/20',
  },
  {
    icon: TestTube,
    label: 'Test Cases',
    prompt: 'Write comprehensive test cases for this codebase',
    color: 'from-violet-500 to-purple-500',
    shadow: 'shadow-violet-500/20',
  },
  {
    icon: Package,
    label: 'Bundle Size',
    prompt: 'Analyze and optimize the bundle size',
    color: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/20',
  },
  {
    icon: ShieldCheck,
    label: 'Production Readiness',
    prompt: 'Analyze this codebase for production readiness',
    color: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/20',
  },
];

export default function WelcomeScreen({ onPrompt }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="size-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-cyan-500/25">
          <Terminal className="size-7 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">
          What can I help you build?
        </h2>
        <p className="text-base-content/50 text-sm max-w-md">
          I'm your AI DevOps assistant. I can generate Dockerfiles, write test cases,
          optimize bundle sizes, and assess production readiness.
        </p>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            id={`suggestion-${s.label.toLowerCase().replace(/\s/g, '-')}`}
            className={`
              group relative overflow-hidden
              bg-base-200/60 hover:bg-base-200
              border border-base-300/50 hover:border-primary/30
              rounded-xl p-4 text-left
              transition-all duration-300
              hover:shadow-lg ${s.shadow}
              hover:-translate-y-0.5
            `}
            onClick={() => onPrompt(s.prompt)}
          >
            <div
              className={`
              size-9 rounded-lg bg-gradient-to-br ${s.color}
              flex items-center justify-center mb-3
              shadow-md ${s.shadow}
              group-hover:scale-110 transition-transform duration-300
            `}
            >
              <s.icon className="size-4 text-white" />
            </div>
            <p className="font-semibold text-sm mb-1">{s.label}</p>
            <p className="text-[11px] text-base-content/50 leading-relaxed line-clamp-2">
              {s.prompt}
            </p>
          </button>
        ))}
      </div>

      {/* Subtle hint */}
      <p className="text-[11px] text-base-content/30 mt-8">
        Type a message below or click a suggestion to get started
      </p>
    </div>
  );
}
