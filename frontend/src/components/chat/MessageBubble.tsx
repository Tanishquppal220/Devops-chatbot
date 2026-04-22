/** Individual chat message bubble with markdown rendering. */

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, FileCode2, TestTube, Package, ShieldCheck, Copy, Check } from 'lucide-react';
import type { Message } from '../../types/chat';

interface MessageBubbleProps {
  message: Message;
}

const AGENT_META: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  general: { icon: Bot, color: 'from-cyan-500 to-teal-500', label: 'General DevOps Assistant' },
  dockerfile: { icon: FileCode2, color: 'from-blue-500 to-cyan-500', label: 'Dockerfile Agent' },
  testcase: { icon: TestTube, color: 'from-violet-500 to-purple-500', label: 'Test Case Agent' },
  bundlesize: { icon: Package, color: 'from-amber-500 to-orange-500', label: 'Bundle Size Agent' },
  production: {
    icon: ShieldCheck,
    color: 'from-emerald-500 to-teal-500',
    label: 'Production Readiness',
  },
};

function normalizeMarkdownContent(content: string): string {
  if (!content) return '';

  const normalizedNewlines = content.replace(/\r\n?/g, '\n');
  return (
    !normalizedNewlines.includes('\n') && /\\n/.test(normalizedNewlines)
      ? normalizedNewlines.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
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
    <div className={`flex gap-3 px-4 py-2 animate-message-in ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div
          className={`
            size-8 rounded-xl shrink-0 flex items-center justify-center shadow-md
            ${
              agentInfo
                ? `bg-linear-to-br ${agentInfo.color}`
                : 'bg-linear-to-br from-cyan-500 to-teal-500'
            }
          `}
        >
          <AgentIcon className="size-4 text-white" />
        </div>
      )}

      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${
            isUser
              ? 'bg-primary text-primary-content rounded-br-md'
              : 'bg-base-200/80 border border-base-300/40 rounded-bl-md'
          }
        `}
      >
        {!isUser && message.progressSteps && message.progressSteps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {message.progressSteps.map((step, i) => (
              <span
                key={i}
                className="badge badge-sm badge-ghost gap-1 text-[10px] font-medium border-base-300/50"
              >
                {step.label}
              </span>
            ))}
          </div>
        )}

        {!isUser && agentInfo && !message.isStreaming && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className={`badge badge-xs bg-linear-to-r ${agentInfo.color} text-white border-0 text-[9px] font-semibold px-2`}
            >
              {agentInfo.label}
            </span>
            {message.filesAnalyzed !== undefined && message.filesAnalyzed > 0 && (
              <span className="text-[10px] text-base-content/40 font-medium">
                {'\u00B7'} {message.filesAnalyzed} files analyzed
              </span>
            )}
          </div>
        )}

        {!isUser && normalizedContent && (
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              onClick={copyMessage}
              className="btn btn-ghost btn-xs gap-1.5 text-base-content/70 hover:text-base-content"
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedContent}</ReactMarkdown>
          </div>
        ) : null}

        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/70 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>

      {isUser && (
        <div className="size-8 rounded-xl shrink-0 flex items-center justify-center bg-base-300/80 shadow-sm">
          <User className="size-4 text-base-content/60" />
        </div>
      )}
    </div>
  );
}
