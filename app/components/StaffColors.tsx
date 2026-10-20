import { staffColorCss, type StaffColor } from '@/lib/staff';

/** Zet --s-<id> voor elke collega, licht en donker thema. */
export function StaffColors({ users }: { users: StaffColor[] }) {
  return <style dangerouslySetInnerHTML={{ __html: staffColorCss(users) }} />;
}
