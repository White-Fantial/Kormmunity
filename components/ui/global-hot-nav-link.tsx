import { HeaderNavLink } from '@/components/ui/header-nav-link';
import { getCurrentUser } from '@/lib/auth/session';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import { getGlobalHotSettings } from '@/lib/reputation-settings';

export async function GlobalHotNavLink() {
  const [currentUser, globalHot] = await Promise.all([
    getCurrentUser(),
    getGlobalHotSettings(),
  ]);
  const isAdmin = currentUser ? canMakeFinalUserDecision(currentUser) : false;

  if (!globalHot.enabled && !isAdmin) {
    return null;
  }

  return (
    <HeaderNavLink href="/posts/global-hot">
      <span className="inline-flex items-center gap-1">
        <span>글로벌핫</span>
        {!globalHot.enabled && isAdmin ? (
          <span className="text-[10px] text-[#8a6d3b]">(비활성)</span>
        ) : null}
      </span>
    </HeaderNavLink>
  );
}
