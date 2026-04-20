/** Top header bar with title and controls. */

import { Menu } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

interface HeaderProps {
  onToggleSidebar: () => void;
  agentLabel?: string;
}

export default function Header({ onToggleSidebar, agentLabel }: HeaderProps) {
  return (
    <header
      id="app-header"
      className="navbar bg-base-100/80 backdrop-blur-xl border-b border-base-300/50 sticky top-0 z-30 px-4"
    >
      <div className="flex-none lg:hidden">
        <button
          id="sidebar-toggle"
          className="btn btn-ghost btn-circle btn-sm"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="size-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3 ml-2">
        {/* Logo */}
        <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <span className="text-white font-bold text-sm">⚡</span>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">DevOps Copilot</h1>
          {agentLabel && (
            <p className="text-[10px] font-medium text-primary/80 uppercase tracking-wider">
              {agentLabel}
            </p>
          )}
        </div>
      </div>

      <div className="flex-none flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
