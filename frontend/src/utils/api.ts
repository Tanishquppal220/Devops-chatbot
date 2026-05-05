/** API helper for SSE streaming to the FastAPI backend. */

import type {
  AgentMode,
  ConversationHistoryItem,
  ConversationRecord,
  DeploymentTarget,
  StoredMessageRecord,
  StreamEvent,
} from '../types/chat';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const HEALTH_ENDPOINT = `${API_BASE}/health`;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number,
  initialDelayMs: number,
): Promise<Response> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      const response = await fetch(url, init);
      if (!response.ok && RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
        attempt += 1;
        await sleep(delay);
        delay = Math.round(delay * 1.8);
        continue;
      }
      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError' || attempt >= retries) {
        throw error;
      }
      attempt += 1;
      await sleep(delay);
      delay = Math.round(delay * 1.8);
    }
  }
}

export interface AnalyzeParams {
  command: string;
  codebasePath: string;
  mode: AgentMode;
  deploymentTarget: DeploymentTarget;
  conversationHistory: ConversationHistoryItem[];
  conversationId?: string;
}

export interface EdgeRuntimeStatus {
  active: boolean;
  reachable: boolean;
  configured_model: string;
  loaded_models: string[];
  reason: string;
}

/**
 * Streams SSE events from the /api/v1/analyze/stream endpoint.
 * Calls `onEvent` for each parsed SSE event.
 */
export async function streamAnalysis(
  params: AnalyzeParams,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetchWithRetry(
    `${API_BASE}/api/v1/analyze/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: params.command,
        codebase_path: params.codebasePath,
        mode: params.mode,
        deployment_target: params.deploymentTarget,
        model_runtime: params.deploymentTarget,
        conversation_history: params.conversationHistory,
        conversation_id: params.conversationId ?? '',
      }),
      signal,
    },
    2,
    300,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const data: StreamEvent = JSON.parse(trimmed.slice(6));
        onEvent(data);
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data: ')) {
      try {
        const data: StreamEvent = JSON.parse(trimmed.slice(6));
        onEvent(data);
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export async function createConversation(title = 'New Chat'): Promise<ConversationRecord> {
  const response = await fetch(`${API_BASE}/api/v1/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Create conversation failed ${response.status}: ${text}`);
  }
  return (await response.json()) as ConversationRecord;
}

export async function fetchConversations(): Promise<ConversationRecord[]> {
  const response = await fetchWithRetry(
    `${API_BASE}/api/v1/conversations`,
    { method: 'GET' },
    4,
    250,
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fetch conversations failed ${response.status}: ${text}`);
  }
  return (await response.json()) as ConversationRecord[];
}

export async function fetchConversationMessages(
  conversationId: string,
): Promise<StoredMessageRecord[]> {
  const response = await fetchWithRetry(
    `${API_BASE}/api/v1/conversations/${conversationId}/messages`,
    { method: 'GET' },
    4,
    250,
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fetch messages failed ${response.status}: ${text}`);
  }
  return (await response.json()) as StoredMessageRecord[];
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<ConversationRecord> {
  const response = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update conversation failed ${response.status}: ${text}`);
  }
  return (await response.json()) as ConversationRecord;
}

export async function deleteConversationById(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (response.status === 404) return;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delete conversation failed ${response.status}: ${text}`);
  }
}

export async function checkEdgeRuntimeStatus(): Promise<EdgeRuntimeStatus> {
  const response = await fetchWithRetry(
    `${API_BASE}/api/v1/runtime/edge/status`,
    { method: 'GET' },
    3,
    250,
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge runtime check failed ${response.status}: ${text}`);
  }
  return (await response.json()) as EdgeRuntimeStatus;
}

/** Simple health check. */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_ENDPOINT, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export interface WaitForHealthyApiOptions {
  attempts?: number;
  intervalMs?: number;
}

export async function waitForHealthyApi({
  attempts = 12,
  intervalMs = 500,
}: WaitForHealthyApiOptions = {}): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    const healthy = await checkHealth();
    if (healthy) return true;
    if (i < attempts - 1) {
      await sleep(intervalMs);
    }
  }
  return false;
}
