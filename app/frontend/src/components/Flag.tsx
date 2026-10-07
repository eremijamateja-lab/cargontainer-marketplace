interface FlagProps {
  code?: string | null;
  className?: string;
}

/**
 * Real country flag via the `flag-icons` package (every ISO 3166-1 alpha-2
 * code is covered). Falls back to a plain letter chip only when no code is
 * given at all.
 */
export default function Flag({ code, className = '' }: FlagProps) {
  const cc = (code || '').toLowerCase();

  if (!cc) return null;

  return (
    <span
      className={`fi fi-${cc} flex-shrink-0 rounded-[3px] ring-1 ring-black/10 bg-gray-100 ${
        className || 'w-[22px] h-4'
      }`}
      title={code || undefined}
    />
  );
}
