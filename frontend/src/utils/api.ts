/** API helper for SSE streaming to the FastAPI backend. */

import type { StreamEvent } from '../types/chat';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface AnalyzeParams {
  command: string;
  codebasePath: string;
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
  const response = await fetch(`${API_BASE}/api/v1/analyze/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      command: params.command,
      codebase_path: params.codebasePath,
    }),
    signal,
  });

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
}

/** Simple health check. */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
