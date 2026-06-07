import { sbTokens as sb } from '../../../design-system';
import { initialsOf } from './formatters';

export function TeacherAvatar({
  name,
  photoUrl,
  size = 44,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `1px solid ${sb.borderCyber}`,
    flexShrink: 0,
  } as const;

  if (photoUrl) {
    return <img src={photoUrl} alt={name} style={{ ...common, objectFit: 'cover' }} />;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        ...common,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: sb.hoverGlow,
        color: sb.active,
        fontWeight: 800,
        fontSize: size * 0.36,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}
