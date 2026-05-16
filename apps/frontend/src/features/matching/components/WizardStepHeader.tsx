interface WizardStepHeaderProps {
  title: string;
  subtitle?: string;
}

export function WizardStepHeader({ title, subtitle }: WizardStepHeaderProps) {
  return (
    <div className="mb-6">
      <h2
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: 'var(--text-2)', fontSize: 15 }}>{subtitle}</p>
      )}
    </div>
  );
}
