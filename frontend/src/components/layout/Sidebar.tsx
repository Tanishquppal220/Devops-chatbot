/** Left sidebar — conversation list + new-chat button. */

import { Plus, MessageSquare, Trash2, X, Terminal } from 'lucide-react';
import type { Conversation } from '../../types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  isOpen,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/35 z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar"
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          neo-frame
          flex flex-col shrink-0
          transition-all duration-300 ease-out
          ${
            isOpen
              ? 'translate-x-0 w-[19rem] opacity-100 animate-slide-in-left'
              : '-translate-x-full lg:translate-x-0 lg:w-0 opacity-0 lg:opacity-100 lg:border-0 lg:shadow-none overflow-hidden'
          }
        `}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 flex items-center justify-between border-b-2 border-[color:color-mix(in_oklab,var(--neo-ink)_35%,transparent)]">
          <div className="flex items-center gap-3">
            <div className="size-9 border-2 border-[var(--neo-ink)] rounded-[4px] bg-[var(--neo-primary)] flex items-center justify-center shadow-[3px_3px_0_color-mix(in_oklab,var(--neo-ink)_52%,transparent)]">
              <Terminal className="size-4 text-white" />
            </div>
            <div>
              <h2 className="type-display font-bold text-sm uppercase">Conversations</h2>
              <p className="type-label text-[10px] text-[var(--neo-ink-soft)]">Ops Console</p>
            </div>
          </div>
          <button
            className="neo-btn size-7 grid place-items-center lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            id="new-chat-btn"
            className="neo-btn neo-btn-primary w-full h-10 font-bold uppercase tracking-wide text-xs flex items-center justify-center gap-2"
            onClick={onNewChat}
          >
            <Plus className="size-4" />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-0.5">
          {conversations.length === 0 ? (
            <div className="neo-frame-soft text-center py-8 px-3 text-[var(--neo-ink-soft)]">
              <MessageSquare className="size-8 mx-auto mb-2 opacity-70" />
              <p className="text-xs font-semibold uppercase">No Conversations Yet</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {conversations.map((convo) => (
                <li key={convo.id} className="relative">
                  <button
                    className={`
                      w-full text-left pl-3 pr-10 py-2.5 border-2 transition-all rounded-[4px]
                      flex items-center gap-2
                      ${
                        convo.id === activeId
                          ? 'border-[var(--neo-ink)] bg-[color:color-mix(in_oklab,var(--neo-primary)_18%,var(--neo-bg)_82%)] text-[var(--neo-ink)] shadow-[4px_4px_0_color-mix(in_oklab,var(--neo-ink)_52%,transparent)]'
                          : 'border-[color:color-mix(in_oklab,var(--neo-ink)_30%,transparent)] bg-[var(--neo-bg)] hover:border-[var(--neo-ink)] hover:bg-[color:color-mix(in_oklab,var(--neo-bg-soft)_85%,transparent)] hover:shadow-[3px_3px_0_color-mix(in_oklab,var(--neo-ink)_44%,transparent)]'
                      }
                    `}
                    onClick={() => onSelect(convo.id)}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span className="truncate text-xs font-semibold uppercase tracking-wide">{convo.title}</span>
                  </button>

                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 neo-btn size-6 grid place-items-center"
                    onClick={() => onDelete(convo.id)}
                    aria-label="Delete conversation"
                    title="Delete conversation"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[color:color-mix(in_oklab,var(--neo-ink)_25%,transparent)]">
          <div className="neo-frame-soft px-2.5 py-2 flex items-center gap-2">
            <div className="size-2 bg-[var(--neo-success)] animate-pulse-glow" />
            <span className="text-[10px] text-[var(--neo-ink-soft)] font-mono uppercase">Backend Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
}
