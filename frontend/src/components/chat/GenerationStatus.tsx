interface GenerationStatusProps {
  stepLabel?: string;
  variant?: 'thinking' | 'sync';
}

export default function GenerationStatus({
  stepLabel,
  variant = 'thinking',
}: GenerationStatusProps) {
  const title = variant === 'sync' ? 'Loading chat context' : 'Assistant is thinking';
  const subtitle = stepLabel || (variant === 'sync' ? 'Preparing conversations' : 'Building response');

  return (
    <div className="generation-status animate-message-in mt-2" role="status" aria-live="polite">
      <div className="generation-status__bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="min-w-0">
        <p className="generation-status__title">{title}</p>
        <p className="generation-status__subtitle truncate">{subtitle}</p>
      </div>
      <span className="generation-status__tag">{variant === 'sync' ? 'Sync' : 'Live'}</span>
    </div>
  );
}
