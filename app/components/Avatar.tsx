import { initials } from '@/lib/staff';

export function Avatar({ id, name, size }: { id: string; name: string; size?: number }) {
  return (
    <div
      className="avatar"
      title={name}
      style={{
        background: `var(--s-${id})`,
        color: 'var(--surface)',
        ...(size ? { width: size, height: size, fontSize: size / 2.6 } : {}),
      }}
    >
      {initials(name)}
    </div>
  );
}
