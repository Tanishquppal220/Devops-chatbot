/** Chat input bar with send / stop buttons. */

import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Square, FolderOpen } from 'lucide-react';
import type { AgentMode } from '../../types/chat';

const MODE_OPTIONS: Array<{ value: AgentMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'general', label: 'General' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'testcase', label: 'Test Cases' },
  { value: 'bundlesize', label: 'Bundle Size' },
  { value: 'production', label: 'Production' },
];

interface ChatInputProps {
  onSend: (command: string, codebasePath: string, mode: AgentMode) => void;
  isStreaming: boolean;
  onCancel: () => void;
  initialPrompt?: string;
  onConsumePrompt?: () => void;
}

export default function ChatInput({
  onSend,
  isStreaming,
  onCancel,
  initialPrompt,
  onConsumePrompt,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [codebasePath, setCodebasePath] = useState('');
  const [mode, setMode] = useState<AgentMode>('auto');
  const [showPath, setShowPath] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Consume initial prompt from welcome screen
  useEffect(() => {
    if (initialPrompt) {
      setMessage(initialPrompt);
      onConsumePrompt?.();
      textareaRef.current?.focus();
    }
  }, [initialPrompt, onConsumePrompt]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed, codebasePath.trim(), mode);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-base-300/50 bg-base-100/80 backdrop-blur-xl p-4">
      {/* Codebase path input (collapsible) */}
      {showPath && (
        <div className="mb-3 animate-message-in">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40 mb-1 block">
            Codebase Path
          </label>
          <input
            id="codebase-path-input"
            type="text"
            className="input input-bordered input-sm w-full bg-base-200/50 text-xs font-mono"
            placeholder="/home/user/my-project"
            value={codebasePath}
            onChange={(e) => setCodebasePath(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        <select
          id="mode-select"
          className="select select-sm select-bordered bg-base-200/50 shrink-0 mb-0.5 w-28"
          value={mode}
          onChange={(e) => setMode(e.target.value as AgentMode)}
          disabled={isStreaming}
          title="Routing mode"
        >
          {MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Path toggle */}
        <button
          id="path-toggle-btn"
          className={`btn btn-ghost btn-sm btn-circle shrink-0 mb-0.5 transition-colors ${
            showPath ? 'text-primary bg-primary/10' : 'text-base-content/40'
          }`}
          onClick={() => setShowPath((p) => !p)}
          aria-label="Set codebase path"
          title="Set codebase path"
        >
          <FolderOpen className="size-4" />
        </button>

        {/* Message textarea */}
        <div className="flex-1 relative">
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="textarea textarea-bordered w-full min-h-11 max-h-40 resize-none bg-base-200/50 text-sm leading-relaxed pr-12 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Ask about Dockerfiles, tests, bundle size, or production readiness…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
        </div>

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            id="stop-btn"
            className="btn btn-error btn-sm btn-circle shrink-0 mb-0.5 shadow-lg shadow-error/20"
            onClick={onCancel}
            aria-label="Stop generating"
          >
            <Square className="size-3.5" />
          </button>
        ) : (
          <button
            id="send-btn"
            className="btn btn-primary btn-sm btn-circle shrink-0 mb-0.5 shadow-lg shadow-primary/20 disabled:shadow-none transition-shadow"
            onClick={handleSubmit}
            disabled={!message.trim()}
            aria-label="Send message"
          >
            <SendHorizonal className="size-4" />
          </button>
        )}
      </div>

      <p className="text-[10px] text-base-content/30 text-center mt-2">
        Press <kbd className="kbd kbd-xs">Enter</kbd> to send · <kbd className="kbd kbd-xs">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
}
