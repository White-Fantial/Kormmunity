import { redirect } from 'next/navigation';

type AdminAdsRedirectPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const TAB_TO_SECTION = {
  campaigns: 'campaigns',
  products: 'products',
  rules: 'rules',
} as const;

export default async function AdminAdsRedirectPage({ searchParams }: AdminAdsRedirectPageProps) {
  const params = await searchParams;
  const section = TAB_TO_SECTION[params.tab as keyof typeof TAB_TO_SECTION] ?? 'campaigns';
  redirect(`/ads-manager/${section}`);
}
