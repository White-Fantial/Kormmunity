import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { UserAvatar } from '@/components/ui/user-avatar';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { updateProfileAction } from './actions';
import {
  deleteSearchAlertAction,
  updateSearchAlertAction,
} from '@/app/posts/search-alert-actions';

export const dynamic = 'force-dynamic';

type MyProfilePageProps = {
  searchParams: Promise<{ success?: string; error?: string; returnTo?: string }>;
};

export default async function MyProfilePage({ searchParams }: MyProfilePageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const [dbUser, cities, searchAlerts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        openChatUrl: true,
        cityId: true,
        profileImageUrl: true,
        notifyOnKakaoForSearchAlert: true,
        notifyOnKakaoForComment: true,
      },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.searchAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        query: true,
        isActive: true,
      },
    }),
  ]);

  return (
    <section className="space-y-4 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
      <h1 className="text-xl font-bold">내 프로필</h1>
      <div className="flex items-center gap-3">
        <UserAvatar
          displayName={user.displayName}
          profileImageUrl={dbUser?.profileImageUrl}
          className="h-14 w-14"
          sizes="56px"
        />
        <p className="text-sm font-medium">{user.displayName}</p>
      </div>
      <p className="text-sm text-[#888]">역할: {user.role}</p>
      <p className="text-sm text-[#888]">상태: {user.status}</p>

      {params.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          프로필이 저장되었어요.
        </p>
      ) : null}

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}

      <form action={updateProfileAction} className="space-y-3 border-t border-[#e8e8e8] pt-4">
        <input type="hidden" name="returnTo" value={params.returnTo ?? ''} />
        <div className="space-y-1">
          <label htmlFor="cityId" className="text-sm font-medium">
            기본 지역
          </label>
          <select
            id="cityId"
            name="cityId"
            defaultValue={dbUser?.cityId ?? ''}
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          >
            <option value="">지역을 선택해 주세요.</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#888]">
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
            className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm focus:border-[#fee500] focus:outline-none focus:ring-2 focus:ring-[#fee500]/40"
          />
          <p className="text-xs text-[#888]">
            등록하면 게시글 상세 페이지에서 연락 버튼이 표시됩니다.
          </p>
        </div>
        <div className="space-y-2 border-t border-[#e8e8e8] pt-3">
          <p className="text-sm font-medium">카카오톡 알림 설정</p>
          <label htmlFor="notifyOnKakaoForSearchAlert" className="flex items-center gap-2 text-sm">
            <input
              id="notifyOnKakaoForSearchAlert"
              type="checkbox"
              name="notifyOnKakaoForSearchAlert"
              defaultChecked={dbUser?.notifyOnKakaoForSearchAlert ?? true}
              className="accent-[#fee500]"
            />
            저장된 검색 조건에 맞는 글이 올라오면 카카오톡 메시지 받기
          </label>
          <label htmlFor="notifyOnKakaoForComment" className="flex items-center gap-2 text-sm">
            <input
              id="notifyOnKakaoForComment"
              type="checkbox"
              name="notifyOnKakaoForComment"
              defaultChecked={dbUser?.notifyOnKakaoForComment ?? true}
              className="accent-[#fee500]"
            />
            내 게시글에 댓글이 달리면 카카오톡 메시지 받기
          </label>
        </div>
        <FormSubmitButton
          idleLabel="저장하기"
          pendingLabel="저장 중..."
          className="w-full rounded-xl bg-[#fee500] px-4 py-3 text-base font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
        />
      </form>

      {searchAlerts.length > 0 ? (
        <div className="space-y-3 border-t border-[#e8e8e8] pt-4">
          <h2 className="text-sm font-semibold">저장된 검색 조건</h2>
          <ul className="space-y-2">
            {searchAlerts.map((alert) => (
              <li key={alert.id} className="rounded-lg border border-[#efefef] p-3">
                <p className="mb-2 text-sm font-medium">
                  &quot;{alert.query}&quot;
                </p>
                <div className="flex flex-wrap gap-2">
                  <form action={updateSearchAlertAction} className="flex items-center gap-2">
                    <input type="hidden" name="alertId" value={alert.id} />
                    <input type="hidden" name="returnTo" value="/my/profile" />
                    <label htmlFor={`alert-active-${alert.id}`} className="flex items-center gap-1 text-xs text-[#555]">
                      <input
                        id={`alert-active-${alert.id}`}
                        type="checkbox"
                        name="isActive"
                        defaultChecked={alert.isActive}
                        className="accent-[#fee500]"
                      />
                      사용
                    </label>
                    <button type="submit" className="rounded-md border border-[#e8e8e8] px-2 py-1 text-xs hover:bg-[#f9f9f9]">
                      저장
                    </button>
                  </form>
                  <form action={deleteSearchAlertAction}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <input type="hidden" name="returnTo" value="/my/profile" />
                    <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
