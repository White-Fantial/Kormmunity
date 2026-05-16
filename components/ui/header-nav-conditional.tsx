import { getCurrentUser } from '@/lib/auth/session';
import {
  canAccessOperatorBoard,
  canMakeFinalUserDecision,
  canModerate,
} from '@/lib/permissions';
import { HeaderNavLink } from '@/components/ui/header-nav-link';

export async function HeaderNavConditional() {
  const currentUser = await getCurrentUser();

  return (
    <>
      {currentUser && canAccessOperatorBoard(currentUser) ? (
        <HeaderNavLink href="/coordinator/board">운영진 게시판</HeaderNavLink>
      ) : null}
      {currentUser && canModerate(currentUser) ? (
        <HeaderNavLink href="/moderator">모더레이션</HeaderNavLink>
      ) : null}
      {currentUser && canMakeFinalUserDecision(currentUser) ? (
        <HeaderNavLink href="/admin">관리자</HeaderNavLink>
      ) : null}
    </>
  );
}
