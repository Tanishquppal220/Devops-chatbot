/** Main layout wrapper — sidebar + header + content area. */

import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import type { Conversation } from '../../types/chat';

interface LayoutProps {
  children: React.ReactNode;
  conversations: Conversation[];
  activeConversationId: string | null;
  agentLabel?: string;
  isBackendReady: boolean;
  isCheckingBackend: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export default function Layout({
  children,
  conversations,
  activeConversationId,
  agentLabel,
  isBackendReady,
  isCheckingBackend,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex overflow-hidden app-shell gap-2 p-2 md:gap-3 md:p-3">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        isBackendReady={isBackendReady}
        isCheckingBackend={isCheckingBackend}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          onNewChat();
          setSidebarOpen(false);
        }}
        onSelect={(id) => {
          onSelectConversation(id);
          setSidebarOpen(false);
        }}
        onDelete={onDeleteConversation}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 gap-2 md:gap-3">
        <Header
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          agentLabel={agentLabel}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
