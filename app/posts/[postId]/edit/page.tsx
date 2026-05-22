import { notFound, redirect } from 'next/navigation';

import { PostForm } from '@/components/posts/post-form';
import { updatePostAction } from '@/app/posts/actions';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  canEditPost,
  canUseAutoContentGeneration,
  getPostCreationFormOptions,
} from '@/lib/permissions';
import { getProfileCityRequiredHref, hasValidProfileCity } from '@/lib/posts/profile-city';
import {
  canSelectAuthorAccount,
  getAuthorAccountOptionsForActor,
} from '@/lib/posts/author-account-options';
import { getCategoryDisplayName } from '@/lib/posts/category-display';



export const dynamic = 'force-dynamic';

type EditPostPageProps = {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditPostPage({
  params,
  searchParams,
}: EditPostPageProps) {
  const user = await requireUser();
  const hasCity = await hasValidProfileCity(user.cityId, user.countryId);

  if (!hasCity) {
    redirect(getProfileCityRequiredHref('/posts'));
  }

  const { postId } = await params;
  const query = await searchParams;

  const [post, formOptions] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        title: true,
        body: true,
        countryId: true,
        cityId: true,
        categoryId: true,
        tags: {
          select: {
            postTagOptionId: true,
          },
        },
        price: true,
        status: true,
        contactUrl: true,
        requireCommentBeforeContact: true,
        createdByUserId: true,
        images: {
          select: { id: true, url: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    getPostCreationFormOptions(user),
  ]);

  if (!post || !canEditPost(user, post)) {
    notFound();
  }

  const canGenerateDraft = canUseAutoContentGeneration(user);
  const canOverrideAuthor = canSelectAuthorAccount(user);
  const authorAccountOptions = canOverrideAuthor
    ? await getAuthorAccountOptionsForActor(
        user,
        formOptions.allowedTargets.map((target) => ({
          countryId: target.countryId,
          cityId: target.cityId,
        })),
      )
    : [];
  const defaultAuthorUserIdOverride =
    canOverrideAuthor && authorAccountOptions.some((option) => option.id === post.authorId)
      ? post.authorId
      : null;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">글 수정</h1>
      {formOptions.allowedTargets.length === 0 ? (
        <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 text-sm text-[#666] shadow-sm">
          현재 글을 수정할 수 있는 작성 권한이 없습니다.
        </div>
      ) : (
        <PostForm
          action={updatePostAction}
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
            label: getCategoryDisplayName(category),
            type: category.type,
            visibilityMode: category.visibilityMode,
            requireCommentBeforeContactDefault: category.requireCommentBeforeContactDefault,
            contactSectionDefaultExpanded: category.contactSectionDefaultExpanded,
            postTagOptions: category.postTagOptions,
          }))}
          allowedTargets={formOptions.allowedTargets}
          defaultCountryId={formOptions.defaultCountryId}
          defaultCityId={formOptions.defaultCityId}
          submitLabel="수정하기"
          canSelectAuthorAccount={canOverrideAuthor}
          canGenerateDraft={canGenerateDraft}
          authorAccountOptions={authorAccountOptions}
          defaultAuthorUserIdOverride={defaultAuthorUserIdOverride}
          errorMessage={query.error}
          defaultValues={{
            postId: post.id,
            title: post.title,
            body: post.body,
            countryId: post.countryId,
            cityId: post.cityId,
            categoryId: post.categoryId,
            postTagOptionIds: post.tags.map((tag) => tag.postTagOptionId),
            price: post.price?.toString() ?? '',
            contactUrl: post.contactUrl,
            requireCommentBeforeContact: post.requireCommentBeforeContact,
            images: post.images,
          }}
        />
      )}
    </section>
  );
}
