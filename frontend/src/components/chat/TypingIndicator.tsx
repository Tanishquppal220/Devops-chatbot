/** Animated typing indicator (three bouncing dots). */

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-2 py-3 animate-message-in">
      <div className="neo-frame-soft flex items-center gap-1.5 px-4 py-2.5 rounded-[4px]">
        <div className="size-2 bg-[var(--neo-primary)] animate-dot-1" />
        <div className="size-2 bg-[var(--neo-primary)] animate-dot-2" />
        <div className="size-2 bg-[var(--neo-primary)] animate-dot-3" />
      </div>
    </div>
  );
}
