/** Top header bar with title and controls. */

import { Menu } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

interface HeaderProps {
  onToggleSidebar: () => void;
  agentLabel?: string;
  isSidebarOpen: boolean;
}

export default function Header({ onToggleSidebar, agentLabel, isSidebarOpen }: HeaderProps) {
  return (
    <header id="app-header" className="sticky top-0 z-30 neo-frame">
      <div className="flex h-14 items-center gap-3 px-3 md:h-15 md:px-4">
        <button
          id="sidebar-toggle"
          className={`neo-btn size-9 grid place-items-center shrink-0 ${
            isSidebarOpen ? 'bg-[var(--neo-primary)] text-white' : 'bg-[var(--neo-bg)] text-[var(--neo-ink)]'
          }`}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="size-4" />
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="size-9 border-2 border-[var(--neo-ink)] rounded-[4px] bg-[var(--neo-accent)] text-[var(--neo-ink)] grid place-items-center font-black text-xs shadow-[3px_3px_0_color-mix(in_oklab,var(--neo-ink)_52%,transparent)]">
            DO
          </div>
          <div className="min-w-0">
            <h1 className="type-display text-sm md:text-[1.06rem] font-bold uppercase">DevOps Copilot</h1>
            <p className="type-label text-[10px] md:text-[11px] text-[var(--neo-ink-soft)]">
              Fast Chat. Precise Infra Answers.
            </p>
          </div>
        </div>

        {agentLabel && (
          <div className="hidden md:flex neo-chip max-w-[32ch] truncate" title={agentLabel}>
            {agentLabel}
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
