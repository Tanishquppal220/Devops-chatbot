/** Main chat window — message list + input bar. */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { AgentMode, Message } from '../../types/chat';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  onSend: (command: string, codebasePath: string, mode: AgentMode) => void;
  onCancel: () => void;
  hasActiveConversation: boolean;
}

export default function ChatWindow({
  messages,
  isStreaming,
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
  const showTyping =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    messages[messages.length - 1]?.content === '' &&
    (messages[messages.length - 1]?.progressSteps?.length ?? 0) === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {showWelcome ? (
          <WelcomeScreen onPrompt={handleWelcomePrompt} />
        ) : (
          <div className="max-w-3xl mx-auto py-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {showTyping && <TypingIndicator />}
            {/* Scroll anchor */}
            <div className="h-1" />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="max-w-3xl mx-auto w-full">
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
