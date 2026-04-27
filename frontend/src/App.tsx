/** Root application component. */

import Layout from './components/layout/Layout';
import ChatWindow from './components/chat/ChatWindow';
import { useChat } from './hooks/useChat';

const AGENT_LABELS: Record<string, string> = {
  general: 'General DevOps Assistant',
  dockerfile: 'Dockerfile Agent',
  testcase: 'Test Case Agent',
  bundlesize: 'Bundle Size Agent',
  production: 'Production Agent',
};

export default function App() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    isStreaming,
    newChat,
    switchConversation,
    deleteConversation,
    sendMessage,
    cancelStream,
  } = useChat();

  // Detect current agent from the last assistant message
  const lastBotMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const agentLabel = lastBotMessage?.agent ? AGENT_LABELS[lastBotMessage.agent] : undefined;

  return (
    <Layout
      conversations={conversations}
      activeConversationId={activeConversationId}
      agentLabel={agentLabel}
      onNewChat={newChat}
      onSelectConversation={switchConversation}
      onDeleteConversation={deleteConversation}
    >
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        onSend={sendMessage}
        onCancel={cancelStream}
        hasActiveConversation={!!activeConversation}
      />
    </Layout>
  );
}
