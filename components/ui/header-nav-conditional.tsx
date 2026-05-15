import { getCurrentUser } from '@/lib/auth/session';
import { canMakeFinalUserDecision, canModerate } from '@/lib/permissions';
import { HeaderNavLink } from '@/components/ui/header-nav-link';

export async function HeaderNavConditional() {
  const currentUser = await getCurrentUser();

  return (
    <>
      {currentUser && canModerate(currentUser) ? (
        <HeaderNavLink href="/moderator">모더레이션</HeaderNavLink>
      ) : null}
      {currentUser && canMakeFinalUserDecision(currentUser) ? (
        <HeaderNavLink href="/admin">관리자</HeaderNavLink>
      ) : null}
    </>
  );
}
