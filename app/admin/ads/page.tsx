import { redirect } from 'next/navigation';

type LegacyAdminAdsPageProps = {
  searchParams: Promise<{ tab?: string; error?: string; success?: string }>;
};

const VALID_SECTIONS = ['campaigns', 'products', 'rules'] as const;

function resolveSection(tab: string | undefined) {
  if (tab && (VALID_SECTIONS as readonly string[]).includes(tab)) {
    return tab;
  }

  return 'campaigns';
}

export default async function LegacyAdminAdsPage({ searchParams }: LegacyAdminAdsPageProps) {
  const params = await searchParams;
  const section = resolveSection(params.tab);
  const query = new URLSearchParams();

  if (params.error) {
    query.set('error', params.error);
  }

  if (params.success) {
    query.set('success', params.success);
  }

  const target = `/ads-manager/${section}`;
  redirect(query.size > 0 ? `${target}?${query.toString()}` : target);
}
