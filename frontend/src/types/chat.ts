/** Shared TypeScript types for the chat system. */

export type AgentMode = 'auto' | 'general' | 'dockerfile' | 'testcase' | 'bundlesize' | 'production';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: AgentMode;
  agent?: string;
  filesAnalyzed?: number;
  isStreaming?: boolean;
  progressSteps?: ProgressStep[];
}

export interface ProgressStep {
  label: string;
  agent?: string;
  timestamp: Date;
}

export interface StreamEvent {
  type: 'progress' | 'token' | 'result' | 'error' | 'done';
  content?: string;
  agent?: string;
  files_analyzed?: number;
  routing_source?: string;
}

export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
