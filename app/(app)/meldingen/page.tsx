import { requireOwner } from '@/lib/session';
import { MeldingenView } from './MeldingenView';

export default async function MeldingenPage() {
  await requireOwner();
  return <MeldingenView />;
}
