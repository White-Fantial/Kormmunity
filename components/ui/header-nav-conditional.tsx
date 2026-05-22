import { getCurrentUser } from '@/lib/auth/session';
import {
  canAccessAdsManagerSection,
  canAccessAdvertiserMemberSection,
  canAccessCoordinatorSection,
  canAccessPartnerManagerSection,
  canAccessOperatorBoard,
  canMakeFinalUserDecision,
  canModerate,
} from '@/lib/permissions';
import { HeaderNavLink } from '@/components/ui/header-nav-link';

export async function HeaderNavConditional() {
  const currentUser = await getCurrentUser();
  const canAccessAdvertiserMember =
    currentUser ? await canAccessAdvertiserMemberSection(currentUser) : false;

  return (
    <>
      {currentUser && canAccessOperatorBoard(currentUser) ? (
        <HeaderNavLink href="/coordinator/board">운영진 게시판</HeaderNavLink>
      ) : null}
      {currentUser && canAccessCoordinatorSection(currentUser) ? (
        <HeaderNavLink href="/coordination">코디네이션</HeaderNavLink>
      ) : null}
      {currentUser && canModerate(currentUser) ? (
        <HeaderNavLink href="/moderator">모더레이션</HeaderNavLink>
      ) : null}
      {currentUser && canAccessAdsManagerSection(currentUser) ? (
        <HeaderNavLink href="/ads-manager/campaigns">광고 매니저</HeaderNavLink>
      ) : null}
      {currentUser && canAccessPartnerManagerSection(currentUser) ? (
        <HeaderNavLink href="/partner-manager">파트너 매니저</HeaderNavLink>
      ) : null}
      {canAccessAdvertiserMember ? (
        <HeaderNavLink href="/advertiser-member/campaigns">광고주 멤버</HeaderNavLink>
      ) : null}
      {currentUser && canMakeFinalUserDecision(currentUser) ? (
        <HeaderNavLink href="/admin">관리자</HeaderNavLink>
      ) : null}
    </>
  );
}
