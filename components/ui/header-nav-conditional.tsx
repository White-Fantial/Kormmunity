import { getCurrentUser } from '@/lib/auth/session';
import { canHoldPost, canMakeFinalUserDecision } from '@/lib/permissions';
import { HeaderNavLink } from '@/components/ui/header-nav-link';

export async function HeaderNavConditional() {
  const currentUser = await getCurrentUser();

  return (
    <>
      {currentUser && canHoldPost(currentUser) ? (
        <HeaderNavLink href="/coordinator">운영 관리</HeaderNavLink>
      ) : null}
      {currentUser && canMakeFinalUserDecision(currentUser) ? (
        <HeaderNavLink href="/admin">관리자</HeaderNavLink>
      ) : null}
    </>
  );
}
