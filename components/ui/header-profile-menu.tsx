import { HeaderProfileMenuClient } from '@/components/ui/header-profile-menu-client';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canAccessAdsManagerSection,
  canAccessAdvertiserMemberSection,
  canAccessCoordinatorSection,
  canAccessOperatorBoard,
  canAccessPartnerManagerSection,
  canMakeFinalUserDecision,
  canModerate,
} from '@/lib/permissions';

export async function HeaderProfileMenu() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return null;
  }

  const canAccessAdvertiserMember = await canAccessAdvertiserMemberSection(currentUser);
  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { profileImageUrl: true },
  });

  const menuItems: { href: string; label: string }[] = [
    { href: '/my/profile', label: '내 프로필' },
    ...(canAccessOperatorBoard(currentUser) ? [{ href: '/coordinator/board', label: '운영진 게시판' }] : []),
    ...(canAccessCoordinatorSection(currentUser) ? [{ href: '/coordination', label: '코디네이션' }] : []),
    ...(canModerate(currentUser) ? [{ href: '/moderator', label: '모더레이션' }] : []),
    ...(canAccessAdsManagerSection(currentUser) ? [{ href: '/ads-manager/campaigns', label: '광고 매니저' }] : []),
    ...(canAccessPartnerManagerSection(currentUser) ? [{ href: '/partner-manager', label: '파트너 매니저' }] : []),
    ...(canAccessAdvertiserMember
      ? [{ href: '/advertiser-member/campaigns', label: '광고주 멤버' }]
      : []),
    ...(canMakeFinalUserDecision(currentUser) ? [{ href: '/admin', label: '관리자' }] : []),
  ];

  return (
    <HeaderProfileMenuClient
      displayName={currentUser.displayName}
      profileImageUrl={dbUser?.profileImageUrl ?? null}
      menuItems={menuItems}
    />
  );
}
