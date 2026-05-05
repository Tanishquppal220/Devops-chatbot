# Chapter 6: SSE Streaming Engine

In [Chapter 5: Conversation Persistence (CRUD)](05_conversation_persistence__crud__.md), we gave our app a memory, allowing it to save and recall conversations. But even with a great memory, waiting for a long AI response can feel slow, like waiting for a physical letter to arrive. Users want to see things happen *now*.

This chapter introduces the **SSE Streaming Engine** – the part of our app that makes AI responses feel alive, appearing on your screen word by word, just like someone is typing in real-time.

---

### The Motivation: Real-time Conversation

Imagine you're listening to a radio broadcast. You hear words as they are spoken, not after the entire speech is finished. Or think about a friend texting you – you see their message appearing character by character. This immediate feedback makes the conversation feel natural and engaging.

Traditional API calls are like getting a full letter: you send a request, wait for the *entire* response to be generated, and then you get the complete package. With AI, generating a response can take many seconds. If the user just sees a spinning loader during this time, they might get bored or think the app is frozen.

Our **SSE Streaming Engine** solves this by:
1.  **Instant Feedback:** Showing the AI's response "token by token" (small pieces of words or characters) as soon as the server generates them.
2.  **Perceived Speed:** Even if the full response takes a while, the continuous stream of words makes the app feel faster and more responsive.
3.  **Rich Updates:** Not just text, but also progress messages (e.g., "Analyzing code...", "Generating Dockerfile...") or even error messages can be streamed in real-time.

---

### Key Concepts

1.  **Server-Sent Events (SSE):** This is the core technology. It's a standard web feature that allows a server to push data to a client (your browser) over a single, long-lived HTTP connection. Think of it as a one-way radio broadcast from the server to your app.
2.  **Tokens:** When the AI generates text, it doesn't usually produce full sentences all at once. It produces "tokens" – these are often parts of words, full words, or punctuation. Our streaming engine catches these tokens.
3.  **Stream Decoder:** Our frontend code needs to be able to listen to this "radio broadcast," decode the incoming data, and understand when a new "event" (like a new token, a progress update, or an error) has arrived.
4.  **Connection Retries:** What if the internet blips for a second? The engine includes logic to automatically try reconnecting to the server, ensuring a robust user experience.

---

### How to Use the Streaming Engine

You, as a developer using our `frontend` project, don't directly interact with the low-level SSE details. Instead, the [Chat State Orchestrator (useChat Hook)](02_chat_state_orchestrator__usechat_hook__.md) handles all that complexity for you.

When you use the `sendMessage` function from `useChat`, it automatically initiates the SSE stream behind the scenes.

```tsx
// Inside your Chat Component, when you send a message
const { messages, sendMessage, isStreaming } = useChat();

const handleSend = () => {
  sendMessage("Generate a Kubernetes manifest for a Node.js app.");
};

return (
  <div>
    {messages.map(m => (
      <p key={m.id}>
        {m.role === 'assistant' ? 'AI: ' : 'You: '}
        {m.content}
      </p>
    ))}
    {isStreaming && (
      <span className="text-gray-500">The AI is thinking...</span>
    )}
    <button onClick={handleSend} disabled={isStreaming}>
      Send Message
    </button>
  </div>
);
```
*Output: After clicking "Send Message", the `isStreaming` indicator will appear. Then, the AI's response will start appearing in the chat window character by character, rather than waiting for the entire response to be completed before showing it.*

---

### Under the Hood: Catching the Radio Waves

When you click "Send," a powerful collaboration happens between the `useChat` hook and our API utility functions to manage the SSE stream.

```mermaid
sequenceDiagram
  participant U as User (UI)
  participant H as useChat Hook
  participant F as API Function (streamAnalysis)
  participant B as Backend AI Service
  
  U->>H: sendMessage("Generate Dockerfile...")
  H->>H: Creates empty bot message
  H->>F: Calls streamAnalysis(params, onEventCallback)
  F->>+B: POST /api/v1/analyze/stream
  B-->>-F: Sends "data: {\"type\": \"token\", \"content\": \"FROM\"}\n"
  F->>H: onEventCallback({type: "token", content: "FROM"})
  H->>H: Appends "FROM" to bot message
  H->>U: UI updates: "FROM" appears
  B-->>-F: Sends "data: {\"type\": \"token\", \"content\": \" node\"}\n"
  F->>H: onEventCallback({type: "token", content: " node"})
  H->>H: Appends " node" to bot message
  H->>U: UI updates: "FROM node" appears
  B-->>-F: Sends "data: {\"type\": \"done\"}\n"
  F->>H: onEventCallback({type: "done"})
  H->>H: Sets isStreaming to false
  H->>U: UI updates: streaming stops
```

#### 1. Making the Stream Request (`src/utils/api.ts`)

The `streamAnalysis` function in `src/utils/api.ts` is the heart of our streaming engine. It's responsible for making the HTTP request, continuously reading the incoming data, and parsing it into usable events.

```typescript
// src/utils/api.ts (simplified)
export async function streamAnalysis(
  params: AnalyzeParams,
  onEvent: (event: StreamEvent) => void, // This is the callback for each event
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetchWithRetry( // Tries connecting multiple times if needed
    `${API_BASE}/api/v1/analyze/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* ... request details ... */ }),
      signal, // Allows cancelling the stream
    },
    2, 300 // Retry up to 2 times with initial 300ms delay
  );

  // ... error handling ...

  const reader = response.body?.getReader(); // Like opening a water hose
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder(); // Helps turn raw data into readable text
  let buffer = ''; // A temporary storage for incomplete messages

  while (true) { // Keep listening until the stream ends
    const { done, value } = await reader.read(); // Read a chunk of data
    if (done) break; // If no more data, we're done

    buffer += decoder.decode(value, { stream: true }); // Add data to buffer
    const lines = buffer.split('\n'); // Split by new lines to get individual SSE events
    buffer = lines.pop() ?? ''; // Keep any incomplete line in the buffer

    for (const line of lines) { // Process each complete line
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue; // Only process actual SSE data

      try {
        const data: StreamEvent = JSON.parse(trimmed.slice(6)); // Parse the JSON data
        onEvent(data); // Call the callback with the parsed event!
      } catch {
        // Ignore malformed lines to prevent crashes
      }
    }
  }
  // ... handle any remaining buffer content ...
}
```
*Explanation: This function first makes a `fetch` request, but instead of waiting for a single response, it gets a continuous `response.body`. The `reader` is like a tap that provides drips of data. `TextDecoder` makes sense of these drips, and the `while (true)` loop continuously reads, collects, and parses incoming "lines" of SSE data. When a complete `data:` line is found, its JSON content is parsed and passed to the `onEvent` function.*

#### 2. Interpreting the Events (`src/types/chat.ts`)

The `StreamEvent` type defines the different kinds of messages our server can send through the stream.

```typescript
// src/types/chat.ts (simplified)
export interface StreamEvent {
  type: 'progress' | 'token' | 'result' | 'error' | 'done'; // What kind of event is this?
  content?: string; // The actual text (for tokens, results, errors)
  agent?: string; // Which agent is sending this? (from Chapter 4)
  files_analyzed?: number; // How many files were processed? (for progress)
  conversation_id?: string; // The ID of the conversation
}
```
*Explanation: This `interface` is like a standardized format for our radio messages. It ensures our frontend knows what to expect for each type of update (e.g., if `type` is `token`, we expect `content` to be a piece of text).*

#### 3. Updating the UI in Real-time (`src/hooks/useChat.ts` - conceptual)

Back in the `useChat` hook, the `onEvent` callback provided to `streamAnalysis` is where the magic happens for the UI. It listens to these events and updates the application's state, causing the messages to appear incrementally.

```tsx
// src/hooks/useChat.ts (conceptual simplified callback within useChat)
const sendMessage = useCallback(async (text: string) => {
  // ... create user message, create empty bot placeholder ...

  const botMsgId = "bot-" + Date.now(); // Unique ID for the bot's message
  updateMessages(activeConversationId, (msgs) => 
    [...msgs, { id: botMsgId, content: "", isStreaming: true }] // Add empty message
  );
  setIsStreaming(true);

  // This is the callback function that streamAnalysis will call for each event
  const onStreamEvent = (event: StreamEvent) => {
    switch (event.type) {
      case 'token':
        updateMessages(activeConversationId, (msgs) =>
          msgs.map(m => m.id === botMsgId ? { ...m, content: m.content + event.content } : m)
        ); // Append new token to the bot's message
        break;
      case 'progress':
        // ... update progress indicators or step labels ...
        break;
      case 'error':
        // ... display error message in the bot's bubble ...
        break;
      case 'done':
        setIsStreaming(false); // Streaming finished!
        updateMessages(activeConversationId, (msgs) =>
          msgs.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m)
        ); // Mark message as no longer streaming
        break;
    }
  };

  try {
    await streamAnalysis(
      { /* ... params like command, history ... */ },
      onStreamEvent, // Pass our callback here!
      abortController.signal
    );
  } catch (error) {
    // ... handle connection errors ...
  }
}, [activeConversationId]);
```
*Explanation: When `sendMessage` is called, it first creates an empty "bot message" placeholder. It then calls `streamAnalysis`, passing `onStreamEvent` as the callback. For every `token` event received, this callback updates the content of that placeholder message. When a `done` event arrives, it stops the `isStreaming` indicator.*

---

### Summary

In this chapter, we learned:
-   The **SSE Streaming Engine** provides real-time, character-by-character updates from the AI.
-   It uses **Server-Sent Events** for a one-way "radio broadcast" from the server.
-   Our `streamAnalysis` function in `src/utils/api.ts` is responsible for fetching, decoding, and parsing these events.
-   The `useChat` hook orchestrates this by providing a callback that updates the UI's messages and streaming status in real-time.
-   This makes the user experience much more engaging and responsive.

Now that our AI's responses are streaming beautifully, we need to make sure they look great, especially when they include complex things like code!

[Next Chapter: Intelligent Markdown Renderer](07_intelligent_markdown_renderer_.md)

---

Generated by [AI Codebase Knowledge Builder](https://github.com/The-Pocket/Tutorial-Codebase-Knowledge)