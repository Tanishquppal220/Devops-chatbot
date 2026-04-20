/** Animated typing indicator (three bouncing dots). */

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 animate-message-in">
      <div className="flex items-center gap-1 bg-base-200 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="size-2 rounded-full bg-primary animate-dot-1" />
        <div className="size-2 rounded-full bg-primary animate-dot-2" />
        <div className="size-2 rounded-full bg-primary animate-dot-3" />
      </div>
    </div>
  );
}
