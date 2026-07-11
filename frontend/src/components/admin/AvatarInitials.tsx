interface AvatarInitialsProps {
  name: string;
  className?: string;
}

export default function AvatarInitials({ name, className }: AvatarInitialsProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className={[
        'flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-900',
        className ?? '',
      ].join(' ')}
      aria-label={`Avatar for ${name}`}
    >
      {initials || 'NA'}
    </div>
  );
}
