import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { updateProfileAction } from './actions';

export const dynamic = 'force-dynamic';

type MyProfilePageProps = {
  searchParams: Promise<{ success?: string; error?: string; returnTo?: string }>;
};

export default async function MyProfilePage({ searchParams }: MyProfilePageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const [dbUser, cities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { openChatUrl: true, cityId: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <section className="space-y-4 rounded-lg border bg-white p-4">
      <h1 className="text-xl font-semibold">내 프로필</h1>
      <p className="text-sm">이름: {user.displayName}</p>
      <p className="text-sm">역할: {user.role}</p>
      <p className="text-sm">상태: {user.status}</p>

      {params.success ? (
        <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-700">
          프로필이 저장되었어요.
        </p>
      ) : null}

      {params.error ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <form action={updateProfileAction} className="space-y-3 border-t pt-4">
        <input type="hidden" name="returnTo" value={params.returnTo ?? ''} />
        <div className="space-y-1">
          <label htmlFor="cityId" className="text-sm font-medium">
            기본 지역
          </label>
          <select
            id="cityId"
            name="cityId"
            defaultValue={dbUser?.cityId ?? ''}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">지역을 선택해 주세요.</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            글쓰기는 여기에서 설정한 지역으로만 등록돼요.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="openChatUrl" className="text-sm font-medium">
            카카오 오픈채팅 링크
          </label>
          <input
            id="openChatUrl"
            name="openChatUrl"
            type="url"
            defaultValue={dbUser?.openChatUrl ?? ''}
            placeholder="https://open.kakao.com/o/..."
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <p className="text-xs text-zinc-500">
            등록하면 게시글 상세 페이지에서 연락 버튼이 표시됩니다.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          저장하기
        </button>
      </form>
    </section>
  );
}
