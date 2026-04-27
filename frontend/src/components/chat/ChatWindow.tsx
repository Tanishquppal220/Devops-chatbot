/** Main chat window — message list + input bar. */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentMode, DeploymentTarget, Message } from '../../types/chat';
import MessageBubble from './MessageBubble';
import GenerationStatus from './GenerationStatus';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  onSend: (
    command: string,
    codebasePath: string,
    mode: AgentMode,
    deploymentTarget: DeploymentTarget,
  ) => void;
  onCancel: () => void;
  hasActiveConversation: boolean;
}

export default function ChatWindow({
  messages,
  isStreaming,
  isLoading,
  onSend,
  onCancel,
  hasActiveConversation,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleWelcomePrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
  }, []);

  const consumePrompt = useCallback(() => {
    setPendingPrompt(undefined);
  }, []);

  const showWelcome = !hasActiveConversation || messages.length === 0;
  const latestAssistant = [...messages]
    .reverse()
    .find((msg) => msg.role === 'assistant' && msg.isStreaming);
  const showGenerationStatus =
    isStreaming && !!latestAssistant && latestAssistant.content.trim().length === 0;
  const latestStepLabel = latestAssistant?.progressSteps?.at(-1)?.label;

  return (
    <div className="flex flex-col h-full w-full neo-frame">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2.5 md:px-5 pt-3 md:pt-4">
        {showWelcome ? (
          <WelcomeScreen onPrompt={handleWelcomePrompt} />
        ) : (
          <div className="w-full py-2 md:py-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {showGenerationStatus && <GenerationStatus stepLabel={latestStepLabel} />}
            {!showGenerationStatus && isLoading && !isStreaming && (
              <GenerationStatus stepLabel="Syncing conversation state..." variant="sync" />
            )}
            {/* Scroll anchor */}
            <div className="h-1" />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="w-full border-t border-[color:color-mix(in_oklab,var(--neo-ink)_25%,transparent)] px-2.5 md:px-5 bg-[var(--neo-bg-soft)] rounded-b-[calc(var(--surface-radius)-1px)]">
        <ChatInput
          onSend={onSend}
          isStreaming={isStreaming}
          onCancel={onCancel}
          initialPrompt={pendingPrompt}
          onConsumePrompt={consumePrompt}
        />
      </div>
    </div>
  );
}
