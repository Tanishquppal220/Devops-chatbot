/** Custom hook for chat state management + SSE streaming. */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  AgentMode,
  Conversation,
  ConversationHistoryItem,
  ConversationRecord,
  DeploymentTarget,
  Message,
  ProgressStep,
  StoredMessageRecord,
} from '../types/chat';
import {
  checkEdgeRuntimeStatus,
  createConversation,
  deleteConversationById,
  fetchConversationMessages,
  fetchConversations,
  streamAnalysis,
} from '../utils/api';

const HISTORY_WINDOW_SIZE = 8;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateTitle(command: string): string {
  const trimmed = command.trim();
  if (trimmed.length <= 40) return trimmed;
  return `${trimmed.slice(0, 37)}...`;
}

function toConversation(record: ConversationRecord): Conversation {
  return {
    id: record.id,
    title: record.title,
    messages: [],
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

function toMessage(record: StoredMessageRecord): Message {
  const role = record.role === 'assistant' ? 'assistant' : 'user';
  return {
    id: record.id,
    role,
    content: record.content,
    timestamp: new Date(record.created_at),
    agent: record.agent || undefined,
  };
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  /** Helper to update a specific conversation's messages. */
  const updateConvoMessages = useCallback(
    (convoId: string, updater: (msgs: Message[]) => Message[], titleUpdate?: string) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? {
                ...c,
                messages: updater(c.messages),
                updatedAt: new Date(),
                ...(titleUpdate ? { title: titleUpdate } : {}),
              }
            : c,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        const items = await fetchConversations();
        if (cancelled) return;
        const normalized = items.map(toConversation);
        setConversations(normalized);
        if (normalized.length > 0) {
          setActiveConversationId(normalized[0].id);
        }
      } catch {
        // Keep UI usable even when persistence backend is unavailable.
      }
    }

    void loadConversations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeConversationId) return;
    const active = conversations.find((c) => c.id === activeConversationId);
    if (!active || active.messages.length > 0) return;

    let cancelled = false;
    setIsLoading(true);
    void fetchConversationMessages(activeConversationId)
      .then((records) => {
        if (cancelled) return;
        const mapped = records.map(toMessage);
        updateConvoMessages(activeConversationId, () => mapped);
      })
      .catch(() => {
        // Ignore to avoid blocking chat UX.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, conversations, updateConvoMessages]);

  /** Create a new conversation and set it as active. */
  const newChat = useCallback(() => {
    void createConversation('New Chat')
      .then((record) => {
        const convo = toConversation(record);
        setConversations((prev) => [convo, ...prev]);
        setActiveConversationId(convo.id);
      })
      .catch(() => {
        const fallback: Conversation = {
          id: generateId(),
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setConversations((prev) => [fallback, ...prev]);
        setActiveConversationId(fallback.id);
      });
  }, []);

  /** Switch to an existing conversation. */
  const switchConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  /** Delete a conversation. */
  const deleteConversation = useCallback(
    (id: string) => {
      void deleteConversationById(id).catch(() => {
        // Keep local deletion behavior if backend delete fails.
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const next = conversations.find((c) => c.id !== id);
        setActiveConversationId(next?.id ?? null);
      }
    },
    [activeConversationId, conversations],
  );

  /** Send a message and stream the response. */
  const sendMessage = useCallback(
    async (
      command: string,
      codebasePath: string,
      mode: AgentMode,
      deploymentTarget: DeploymentTarget,
    ) => {
      if (isStreaming) return;

      // Ensure we have a conversation
      let convoId = activeConversationId;
      if (!convoId) {
        try {
          const created = await createConversation(generateTitle(command));
          const convo = toConversation(created);
          setConversations((prev) => [convo, ...prev]);
          setActiveConversationId(convo.id);
          convoId = convo.id;
        } catch {
          const convo: Conversation = {
            id: generateId(),
            title: generateTitle(command),
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setConversations((prev) => [convo, ...prev]);
          setActiveConversationId(convo.id);
          convoId = convo.id;
        }
      }

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: command,
        timestamp: new Date(),
        mode,
        deploymentTarget,
      };

      const currentMessages = conversations.find((c) => c.id === convoId)?.messages ?? [];
      const conversationHistory: ConversationHistoryItem[] = [...currentMessages, userMsg]
        .filter((msg) => msg.content.trim().length > 0)
        .slice(-HISTORY_WINDOW_SIZE)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          agent: msg.agent,
        }));

      // Update title if this is the first message
      const isFirst = (conversations.find((c) => c.id === convoId)?.messages.length ?? 0) === 0;
      updateConvoMessages(
        convoId,
        (msgs) => [...msgs, userMsg],
        isFirst ? generateTitle(command) : undefined,
      );

      // Create bot placeholder
      const botMsgId = generateId();
      const botMsg: Message = {
        id: botMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        progressSteps: [],
      };

      updateConvoMessages(convoId, (msgs) => [...msgs, botMsg]);

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (deploymentTarget === 'edge') {
          const edgeStatus = await checkEdgeRuntimeStatus();
          if (!edgeStatus.active) {
            throw new Error(edgeStatus.reason || 'Edge runtime unavailable');
          }
        }

        await streamAnalysis(
          {
            command,
            codebasePath,
            mode,
            deploymentTarget,
            conversationHistory,
            conversationId: convoId,
          },
          (event) => {
            switch (event.type) {
              case 'progress':
                updateConvoMessages(convoId!, (msgs) =>
                  msgs.map((m) =>
                    m.id === botMsgId
                      ? {
                          ...m,
                          progressSteps: [
                            ...(m.progressSteps ?? []),
                            {
                              label: event.content ?? '',
                              agent: event.agent,
                              timestamp: new Date(),
                            } as ProgressStep,
                          ],
                        }
                      : m,
                  ),
                );
                break;

              case 'token':
                updateConvoMessages(convoId!, (msgs) =>
                  msgs.map((m) =>
                    m.id === botMsgId ? { ...m, content: m.content + (event.content ?? '') } : m,
                  ),
                );
                break;

              case 'result':
                updateConvoMessages(convoId!, (msgs) =>
                  msgs.map((m) =>
                    m.id === botMsgId
                      ? {
                          ...m,
                          content: event.content ?? m.content,
                          agent: event.agent,
                          filesAnalyzed: event.files_analyzed,
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
                break;

              case 'error':
                updateConvoMessages(convoId!, (msgs) =>
                  msgs.map((m) =>
                    m.id === botMsgId
                      ? {
                          ...m,
                          content: `Error: ${event.content}`,
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
                break;

              case 'done':
                updateConvoMessages(convoId!, (msgs) =>
                  msgs.map((m) => (m.id === botMsgId ? { ...m, isStreaming: false } : m)),
                );
                break;
            }
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          updateConvoMessages(convoId!, (msgs) =>
            msgs.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    content: `Connection error: ${(err as Error).message}`,
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeConversationId, conversations, isStreaming, updateConvoMessages],
  );

  /** Cancel an in-progress stream. */
  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    isStreaming,
    isLoading,
    newChat,
    switchConversation,
    deleteConversation,
    sendMessage,
    cancelStream,
  };
}
