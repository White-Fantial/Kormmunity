import { HeaderNavLink } from '@/components/ui/header-nav-link';

type ManagementNavItem = {
  href: `/${string}`;
  label: string;
};

export const coordinatorManagementNavItems = [
  { href: '/coordinator', label: '대시보드' },
  { href: '/coordinator/reports', label: '신고 내역' },
  { href: '/coordinator/kakao-messages', label: '카카오 알림 로그' },
] as const satisfies readonly ManagementNavItem[];

export const adminManagementNavItems = [
  { href: '/admin/users', label: '사용자' },
  { href: '/admin/posts', label: '게시글' },
  { href: '/admin/post-permissions', label: '게시글 권한' },
  { href: '/admin/report-options', label: '신고 옵션' },
  { href: '/admin/reputation-settings', label: '점수/온기 설정' },
  { href: '/admin/categories', label: '카테고리' },
  { href: '/admin/cities', label: '국가/도시' },
] as const satisfies readonly ManagementNavItem[];

type ManagementSectionNavProps = {
  items: readonly ManagementNavItem[];
};

export function ManagementSectionNav({ items }: ManagementSectionNavProps) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {items.map((item) => (
        <HeaderNavLink key={item.href} href={item.href}>
          {item.label}
        </HeaderNavLink>
      ))}
    </nav>
  );
}
