import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { selectCountryAction } from './actions';



export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '국가 선택' };

type SelectCountryPageProps = {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
};

export default async function SelectCountryPage({ searchParams }: SelectCountryPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Already selected → no need to be here
  if (user.countryId) {
    redirect('/posts');
  }

  const params = await searchParams;

  const countries = await prisma.country.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  });

  // Pre-select New Zealand by default
  const defaultCountry = countries.find((c) => c.name === 'New Zealand') ?? countries[0];

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fee500] text-xl font-black text-[#3c1e1e]">K</span>
        <h1 className="text-xl font-bold">거주 국가 선택</h1>
      </div>

      <p className="text-sm text-[#555]">
        서비스를 이용할 국가를 선택해 주세요.
      </p>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <form action={selectCountryAction} className="space-y-4">
        <input type="hidden" name="returnTo" value={params.returnTo ?? ''} />
        <div className="space-y-2">
          {countries.map((country) => (
            <label
              key={country.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e8e8e8] bg-white p-4 hover:border-[#fee500] hover:bg-[#fffde7]"
            >
              <input
                type="radio"
                name="countryId"
                value={country.id}
                defaultChecked={country.id === defaultCountry?.id}
                className="accent-[#fee500]"
              />
              <span className="font-medium">{country.name}</span>
            </label>
          ))}
        </div>
        <FormSubmitButton
          idleLabel="선택 완료"
          pendingLabel="저장 중..."
          className="w-full rounded-xl bg-[#fee500] px-4 py-3 text-base font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
        />
      </form>
    </section>
  );
}
