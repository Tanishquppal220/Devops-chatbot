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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar"
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-base-200/95 backdrop-blur-xl
          border-r border-base-300/50
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0 animate-slide-in-left' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar header */}
        <div className="p-4 flex items-center justify-between border-b border-base-300/50">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Terminal className="size-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">DevOps Copilot</h2>
              <p className="text-[10px] text-base-content/50 font-medium">AI Assistant</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-circle btn-xs lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            id="new-chat-btn"
            className="btn btn-primary btn-sm w-full gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            onClick={onNewChat}
          >
            <Plus className="size-4" />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-base-content/30">
              <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">No conversations yet</p>
            </div>
          ) : (
            <ul className="menu menu-sm gap-1 p-0">
              {conversations.map((convo) => (
                <li key={convo.id}>
                  <button
                    className={`
                      flex items-center justify-between gap-2 rounded-lg px-3 py-2.5
                      transition-all duration-200 group text-left w-full
                      ${
                        convo.id === activeId
                          ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                          : 'hover:bg-base-300/50'
                      }
                    `}
                    onClick={() => onSelect(convo.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="size-3.5 shrink-0 opacity-60" />
                      <span className="truncate text-xs">{convo.title}</span>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 btn btn-ghost btn-xs btn-circle transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(convo.id);
                      }}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-base-300/50">
          <div className="flex items-center gap-2 px-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span className="text-[10px] text-base-content/50 font-medium">Backend Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
}
