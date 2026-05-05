/** Chat input bar with send / stop buttons. */

import { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Square, FolderOpen } from 'lucide-react';
import type { AgentMode, DeploymentTarget } from '../../types/chat';

const MODE_OPTIONS: Array<{ value: AgentMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'general', label: 'General' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'testcase', label: 'Test Cases' },
  { value: 'bundlesize', label: 'Bundle Size' },
  { value: 'production', label: 'Production' },
];

interface ChatInputProps {
  onSend: (
    command: string,
    codebasePath: string,
    mode: AgentMode,
    deploymentTarget: DeploymentTarget,
  ) => void;
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
  const [deploymentTarget, setDeploymentTarget] = useState<DeploymentTarget>('cloud');
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
    onSend(trimmed, codebasePath.trim(), mode, deploymentTarget);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="py-3 md:py-4">
      {/* Codebase path input (collapsible) */}
      {showPath && (
        <div className="mb-3 animate-message-in">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--neo-ink-soft)] mb-1 block">
            Codebase Path
          </label>
          <input
            id="codebase-path-input"
            type="text"
            className="neo-control h-9 w-full px-3 text-xs font-mono rounded-[4px]"
            placeholder="/home/user/my-project"
            value={codebasePath}
            onChange={(e) => setCodebasePath(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 md:gap-2.5 md:grid-cols-[7.5rem_8.2rem_2.75rem_minmax(0,1fr)_2.75rem] md:items-center">
        <select
          id="deployment-target-select"
          className="neo-control h-11 w-full px-2.5 text-xs font-semibold uppercase rounded-[4px]"
          value={deploymentTarget}
          onChange={(e) => setDeploymentTarget(e.target.value as DeploymentTarget)}
          disabled={isStreaming}
          title="Deployment target"
        >
          <option value="cloud">Cloud</option>
          <option value="edge">Edge</option>
        </select>

        <select
          id="mode-select"
          className="neo-control h-11 w-full px-2.5 text-xs font-semibold uppercase rounded-[4px]"
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
          className={`neo-btn h-11 w-11 grid place-items-center ${
            showPath ? 'bg-[var(--neo-accent)] text-[var(--neo-ink)]' : 'bg-[var(--neo-bg)] text-[var(--neo-ink-soft)]'
          }`}
          onClick={() => setShowPath((p) => !p)}
          aria-label="Set codebase path"
          title="Set codebase path"
        >
          <FolderOpen className="size-4" />
        </button>

        {/* Message textarea */}
        <div className="relative">
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="neo-control w-full h-11 min-h-11 max-h-40 resize-none text-sm leading-[1.45] pr-3 pl-3 py-2.5 transition-all rounded-[4px]"
            placeholder="Ask about Dockerfiles, tests, bundle size, or production readiness..."
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
            className="neo-btn neo-btn-danger h-11 w-11 grid place-items-center"
            onClick={onCancel}
            aria-label="Stop generating"
          >
            <Square className="size-3.5" />
          </button>
        ) : (
          <button
            id="send-btn"
            className="neo-btn neo-btn-primary h-11 w-11 grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!message.trim()}
            aria-label="Send message"
          >
            <SendHorizonal className="size-4" />
          </button>
        )}
      </div>

      <p className="type-label text-[10px] text-[var(--neo-ink-soft)] text-center mt-2">
        Enter to send | Shift + Enter new line
      </p>
    </div>
  );
}
