import type { Metadata } from 'next';

import { PostForm } from '@/components/posts/post-form';
import { createPostAction } from '@/app/posts/actions';
import { requireUser } from '@/lib/auth/session';
import { getPostCreationFormOptions } from '@/lib/permissions';
import { getProfileCityRequiredHref, hasValidProfileCity } from '@/lib/posts/profile-city';
import { redirect } from 'next/navigation';



export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '글쓰기',
  description: '새로운 글을 빠르게 작성해 공유해 보세요.',
};

type NewPostPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const user = await requireUser();
  const hasCity = await hasValidProfileCity(user.cityId, user.countryId);

  if (!hasCity) {
    redirect(getProfileCityRequiredHref('/posts/new'));
  }

  const params = await searchParams;
  const formOptions = await getPostCreationFormOptions(user);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">글쓰기</h1>
      {formOptions.allowedTargets.length === 0 ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#666] shadow-sm">
          현재 글을 작성할 수 있는 권한이 없습니다.
        </div>
      ) : (
        <PostForm
          action={createPostAction}
          countries={formOptions.countries.map((country) => ({
            id: country.id,
            label: country.name,
          }))}
          cities={formOptions.cities.map((city) => ({
            id: city.id,
            label: city.name,
            countryId: city.countryId,
          }))}
          categories={formOptions.categories.map((category) => ({
            id: category.id,
            label: category.name,
            type: category.type,
            visibilityMode: category.visibilityMode,
            requireCommentBeforeContactDefault: category.requireCommentBeforeContactDefault,
            postTagOptions: category.postTagOptions,
          }))}
          allowedTargets={formOptions.allowedTargets}
          defaultCountryId={formOptions.defaultCountryId}
          defaultCityId={formOptions.defaultCityId}
          submitLabel="올리기"
          errorMessage={params.error}
        />
      )}
    </section>
  );
}
