/** Individual chat message bubble with markdown rendering. */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, FileCode2, TestTube, Package, ShieldCheck } from 'lucide-react';
import type { Message } from '../../types/chat';

interface MessageBubbleProps {
  message: Message;
}

const AGENT_META: Record<string, { icon: typeof Bot; color: string; label: string }> = {
  dockerfile: { icon: FileCode2, color: 'from-blue-500 to-cyan-500', label: 'Dockerfile Agent' },
  testcase: { icon: TestTube, color: 'from-violet-500 to-purple-500', label: 'Test Case Agent' },
  bundlesize: { icon: Package, color: 'from-amber-500 to-orange-500', label: 'Bundle Size Agent' },
  production: {
    icon: ShieldCheck,
    color: 'from-emerald-500 to-teal-500',
    label: 'Production Readiness',
  },
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const agentInfo = message.agent ? AGENT_META[message.agent] : null;
  const AgentIcon = agentInfo?.icon ?? Bot;

  return (
    <div className={`flex gap-3 px-4 py-2 animate-message-in ${isUser ? 'justify-end' : ''}`}>
      {/* Bot avatar */}
      {!isUser && (
        <div
          className={`
            size-8 rounded-xl shrink-0 flex items-center justify-center shadow-md
            ${
              agentInfo
                ? `bg-gradient-to-br ${agentInfo.color}`
                : 'bg-gradient-to-br from-cyan-500 to-teal-500'
            }
          `}
        >
          <AgentIcon className="size-4 text-white" />
        </div>
      )}

      {/* Bubble */}
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
        {/* Progress steps */}
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

        {/* Agent label */}
        {!isUser && agentInfo && !message.isStreaming && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className={`badge badge-xs bg-gradient-to-r ${agentInfo.color} text-white border-0 text-[9px] font-semibold px-2`}
            >
              {agentInfo.label}
            </span>
            {message.filesAnalyzed !== undefined && message.filesAnalyzed > 0 && (
              <span className="text-[10px] text-base-content/40 font-medium">
                · {message.filesAnalyzed} files analyzed
              </span>
            )}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <p>{message.content}</p>
        ) : message.content ? (
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : null}

        {/* Streaming cursor */}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-primary/70 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="size-8 rounded-xl shrink-0 flex items-center justify-center bg-base-300/80 shadow-sm">
          <User className="size-4 text-base-content/60" />
        </div>
      )}
    </div>
  );
}
