import { cn } from "#/lib/utils.ts";

interface PersonAvatarProps {
  name: string | null;
  email: string;
  className?: string;
}

function getInitials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PersonAvatar({ name, email, className }: PersonAvatarProps) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--kicker)]",
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </span>
  );
}
