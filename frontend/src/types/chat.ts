/** Shared TypeScript types for the chat system. */

export type AgentMode = 'auto' | 'general' | 'dockerfile' | 'testcase' | 'bundlesize' | 'production';
export type DeploymentTarget = 'edge' | 'cloud';
export type ModelRuntime = 'cloud' | 'lmstudio';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mode?: AgentMode;
  deploymentTarget?: DeploymentTarget;
  modelRuntime?: ModelRuntime;
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
  conversation_id?: string;
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

export interface ConversationRecord {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface StoredMessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  agent: string;
  message_order: number;
  created_at: string;
}
