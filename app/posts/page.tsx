import Link from 'next/link';
import type { Metadata } from 'next';

import { PostCard } from '@/components/posts/post-card';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { ALWAYS_INCLUDED_CATEGORY_SLUGS } from '@/lib/posts/constants';
import { getActiveCategories, getActiveCities } from '@/lib/posts/reference-data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '홈',
  description: '뉴질랜드 한인 커뮤니티의 최신 게시글을 확인해 보세요.',
};

type PostsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    city?: string | string[];
  }>;
};

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();

  const [categories, cities, dbUser] = await Promise.all([
    getActiveCategories(),
    getActiveCities(),
    currentUser
      ? prisma.user.findUnique({
          where: { id: currentUser.id },
          select: { cityId: true },
        })
      : Promise.resolve(null),
  ]);

  const alwaysIncludedCategorySlugSet = new Set<string>(ALWAYS_INCLUDED_CATEGORY_SLUGS);
  const alwaysIncludedCategories = categories.filter((category) =>
    alwaysIncludedCategorySlugSet.has(category.slug),
  );
  const filterCategories = categories.filter(
    (category) => !alwaysIncludedCategorySlugSet.has(category.slug),
  );
  const filterCategoryIds = new Set(filterCategories.map((category) => category.id));
  const cityIds = new Set(cities.map((city) => city.id));
  const profileCityId = dbUser?.cityId;
  const selectedFilterCategoryIdsFromParams = Array.from(
    new Set(toArray(params.category).filter((id) => filterCategoryIds.has(id))),
  );
  const selectedFilterCategoryIds =
    selectedFilterCategoryIdsFromParams.length > 0
      ? selectedFilterCategoryIdsFromParams
      : filterCategories.map((category) => category.id);
  const selectedCategoryIds = Array.from(
    new Set([
      ...selectedFilterCategoryIds,
      ...alwaysIncludedCategories.map((category) => category.id),
    ]),
  );
  const selectedCityIdsFromParams = Array.from(
    new Set(toArray(params.city).filter((id) => cityIds.has(id))),
  );
  const selectedCityIdsBase =
    selectedCityIdsFromParams.length > 0
      ? selectedCityIdsFromParams
      : cities.map((city) => city.id);
  const selectedCityIds =
    profileCityId &&
    cityIds.has(profileCityId) &&
    !selectedCityIdsBase.includes(profileCityId)
      ? [...selectedCityIdsBase, profileCityId]
      : selectedCityIdsBase;

  const shouldFilterByCategory =
    selectedFilterCategoryIds.length !== filterCategories.length;
  const shouldFilterByCity = selectedCityIds.length !== cities.length;

  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      categoryId: shouldFilterByCategory ? { in: selectedCategoryIds } : undefined,
      ...(shouldFilterByCity
        ? { OR: [{ cityId: { in: selectedCityIds } }, { cityId: null }] }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      saleStatus: true,
      price: true,
      category: { select: { name: true } },
      city: { select: { name: true } },
      author: {
        select: {
          displayName: true,
          profileImageUrl: true,
        },
      },
      images: {
        select: { url: true },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
      _count: {
        select: {
          comments: {
            where: { status: 'PUBLISHED' },
          },
        },
      },
    },
  });

  const hasFilters = shouldFilterByCategory || shouldFilterByCity;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">홈</h1>
        <Link href="/posts/new" className="rounded-md bg-black px-3 py-2 text-sm text-white">
          글쓰기
        </Link>
      </div>

      <form>
        <details className="group rounded-lg border bg-white p-3">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
            <span>필터</span>
            <span className="group-open:hidden">펼치기</span>
            <span className="hidden group-open:inline">접기</span>
          </summary>

          <div className="mt-3 hidden grid-cols-1 gap-4 group-open:grid sm:grid-cols-2">
            <fieldset className="space-y-2 text-sm">
              <legend className="font-medium">카테고리 선택</legend>
              <div className="flex flex-wrap gap-2">
                {filterCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5"
                  >
                    <input
                      type="checkbox"
                      name="category"
                      value={category.id}
                      defaultChecked={selectedFilterCategoryIds.includes(category.id)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2 text-sm">
              <legend className="font-medium">지역 선택</legend>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => {
                  const isProfileCity = city.id === profileCityId;

                  return (
                    <label
                      key={city.id}
                      className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5"
                    >
                      <input
                        type="checkbox"
                        name="city"
                        value={city.id}
                        defaultChecked={selectedCityIds.includes(city.id)}
                        disabled={isProfileCity}
                        aria-label={
                          isProfileCity
                            ? `${city.name} (프로필 기본 지역으로 항상 선택됨)`
                            : city.name
                        }
                      />
                      <span>{city.name}</span>
                      {isProfileCity ? (
                        <span className="text-xs text-zinc-500">(기본 지역)</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white"
              >
                필터 적용
              </button>
              <Link href="/posts" className="rounded-md border px-3 py-2 text-sm">
                초기화
              </Link>
            </div>
          </div>
        </details>
      </form>

      {posts.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center text-sm text-zinc-600">
          {hasFilters
            ? '선택한 조건에 맞는 글이 없어요.'
            : '아직 올라온 글이 없어요. 첫 글을 남겨보세요.'}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                price: post.price ? post.price.toString() : null,
                thumbnailUrl: post.images[0]?.url ?? null,
                commentCount: post._count.comments,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
