import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { adminManagementNavItems, ManagementSectionHeader } from '@/components/admin/management-section-nav';
import { DateTimeText } from '@/components/ui/date-time-text';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdmin } from '@/lib/permissions';
import { getDashboardStats, type DashboardRange } from '@/lib/admin/stats';
import { truncatePostBody } from '@/lib/posts/constants';

export const dynamic = 'force-dynamic';

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'yesterday', label: '어제' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
];

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  SEARCH_ALERT: '검색 알림',
  COMMENT_NOTIFICATION: '댓글 알림',
  AD_PROPOSAL_SUBMITTED: '광고 제안 알림',
  AD_CAMPAIGN_REVIEW_REQUESTED: '광고 리뷰 요청',
  AD_CAMPAIGN_APPROVED: '광고 승인',
  AD_CAMPAIGN_CHANGES_REQUESTED: '광고 수정요청',
};

function isValidRange(value: string | undefined): value is DashboardRange {
  return value === 'today' || value === 'yesterday' || value === 'week' || value === 'month';
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function KpiCard({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
      <p className="text-xs text-[#888]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">{value}</p>
      {note ? <p className="mt-1 text-xs text-[#aaa]">{note}</p> : null}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-[#aaa]">{text}</p>;
}

type AdminDashboardPageProps = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    redirect('/posts');
  }

  const params = await searchParams;
  const range: DashboardRange = isValidRange(params.range) ? params.range : 'today';

  const stats = await getDashboardStats(range);

  return (
    <section className="space-y-6">
      <ManagementSectionHeader
        sectionLabel="관리자"
        pageLabel="대시보드"
        items={adminManagementNavItems}
      />

      {/* ── Date range selector ─────────────────────────────────────────────── */}
      <form className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="submit"
            name="range"
            value={opt.value}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              range === opt.value
                ? 'border-[#fee500] bg-[#fee500] font-semibold text-[#3c1e1e]'
                : 'border-[#e8e8e8] hover:border-[#fee500] hover:bg-[#fffde7]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </form>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#555]">
          핵심 지표 — {stats.rangeLabel}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiCard label="게시글 생성" value={stats.kpi.postsCreated} />
          <KpiCard label="댓글 생성" value={stats.kpi.commentsCreated} />
          <KpiCard label="신규 사용자" value={stats.kpi.newUsers} />
          <KpiCard label="신고 접수" value={stats.kpi.reportsCreated} />
          <KpiCard label={`페이지뷰 (${stats.rangeLabel})`} value={stats.visitors.totalViewsInRange} />
          <KpiCard label="페이지뷰 (오늘)" value={stats.visitors.totalViewsToday} />
          <KpiCard
            label="미확정 신고 (전체)"
            value={stats.kpi.pendingReports}
            note="누적 미처리 건수"
          />
          <KpiCard label="카카오 대기 (전체)" value={stats.kpi.kakaoPending} />
          <KpiCard label="카카오 성공 (오늘)" value={stats.kpi.kakaoSuccessInRange} />
          <KpiCard label="카카오 실패 (오늘)" value={stats.kpi.kakaoFailedInRange} />
          <KpiCard
            label="카카오 장시간 대기"
            value={stats.kpi.kakaoLongPending}
            note="5분 이상 PENDING"
          />
        </div>
      </div>

      {/* ── Visitor overview ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#555]">방문자 현황</h2>

        <SectionCard title={`상위 방문 경로 Top 10 (${stats.rangeLabel})`}>
          {stats.visitors.topPaths.length === 0 ? (
            <EmptyNote text="방문 경로 데이터가 없습니다." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">경로</th>
                  <th className="pb-2 font-medium text-right">페이지뷰</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {stats.visitors.topPaths.map((item) => (
                  <tr key={item.path}>
                    <td className="max-w-0 truncate py-1.5 pr-2">{item.path}</td>
                    <td className="py-1.5 text-right tabular-nums">{item.viewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="최근 7일 일별 페이지뷰">
          {stats.visitors.dailyTrend.length === 0 ? (
            <EmptyNote text="방문 추이 데이터가 없습니다." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">날짜</th>
                  <th className="pb-2 font-medium text-right">페이지뷰</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {stats.visitors.dailyTrend.map((item) => (
                  <tr key={item.date}>
                    <td className="py-1.5 pr-2">{item.date}</td>
                    <td className="py-1.5 text-right tabular-nums">{item.viewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {/* ── Content overview ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#555]">콘텐츠 현황</h2>

        {/* Recent posts */}
        <SectionCard title="최근 게시글">
          {stats.content.recentPosts.length === 0 ? (
            <EmptyNote text="최근 게시글이 없습니다." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {stats.content.recentPosts.map((post) => (
                <li key={post.id} className="py-2">
                  <Link href={`/posts/${post.id}`} className="text-sm font-medium hover:underline">
                    {post.title ?? truncatePostBody(post.body)}
                  </Link>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {post.author.displayName}
                    {post.city ? ` · ${post.city.name}` : ''}
                    {` · ${post.category.name}`}
                    {' · '}
                    <DateTimeText value={post.createdAt} mode="relative" />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Most viewed posts */}
        <SectionCard title="조회수 상위 게시글 (viewCount 기준)">
          {stats.content.mostViewedPosts.length === 0 ? (
            <EmptyNote text="게시글이 없습니다." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">제목</th>
                  <th className="pb-2 font-medium text-right">조회</th>
                  <th className="pb-2 font-medium text-right">좋아요</th>
                  <th className="pb-2 font-medium text-right">댓글</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {stats.content.mostViewedPosts.map((post) => (
                  <tr key={post.id}>
                    <td className="py-1.5 pr-2">
                      <Link href={`/posts/${post.id}`} className="hover:underline">
                        {post.title ?? truncatePostBody(post.body)}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{post.viewCount}</td>
                    <td className="py-1.5 text-right tabular-nums">{post._count.postLikes}</td>
                    <td className="py-1.5 text-right tabular-nums">{post._count.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Most liked posts */}
        <SectionCard title="좋아요 상위 게시글">
          {stats.content.mostLikedPosts.length === 0 ? (
            <EmptyNote text="게시글이 없습니다." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">제목</th>
                  <th className="pb-2 font-medium text-right">좋아요</th>
                  <th className="pb-2 font-medium text-right">조회</th>
                  <th className="pb-2 font-medium text-right">댓글</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {stats.content.mostLikedPosts.map((post) => (
                  <tr key={post.id}>
                    <td className="py-1.5 pr-2">
                      <Link href={`/posts/${post.id}`} className="hover:underline">
                        {post.title ?? truncatePostBody(post.body)}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{post._count.postLikes}</td>
                    <td className="py-1.5 text-right tabular-nums">{post.viewCount}</td>
                    <td className="py-1.5 text-right tabular-nums">{post._count.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Most commented posts */}
        <SectionCard title="댓글 많은 게시글">
          {stats.content.mostCommentedPosts.length === 0 ? (
            <EmptyNote text="게시글이 없습니다." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#888]">
                  <th className="pb-2 font-medium">제목</th>
                  <th className="pb-2 font-medium text-right">댓글</th>
                  <th className="pb-2 font-medium text-right">좋아요</th>
                  <th className="pb-2 font-medium text-right">조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {stats.content.mostCommentedPosts.map((post) => (
                  <tr key={post.id}>
                    <td className="py-1.5 pr-2">
                      <Link href={`/posts/${post.id}`} className="hover:underline">
                        {post.title ?? truncatePostBody(post.body)}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{post._count.comments}</td>
                    <td className="py-1.5 text-right tabular-nums">{post._count.postLikes}</td>
                    <td className="py-1.5 text-right tabular-nums">{post.viewCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Posts by city */}
        <SectionCard title="도시별 게시글 (전체 PUBLISHED)">
          {stats.content.postsByCity.length === 0 ? (
            <EmptyNote text="데이터가 없습니다." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {stats.content.postsByCity.map((item) => (
                <li key={item.cityName} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{item.cityName}</span>
                  <span className="tabular-nums text-[#555]">{item.count}건</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Posts by category */}
        <SectionCard title="카테고리별 게시글 (전체 PUBLISHED)">
          {stats.content.postsByCategory.length === 0 ? (
            <EmptyNote text="데이터가 없습니다." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {stats.content.postsByCategory.map((item) => (
                <li key={item.categoryName} className="flex items-center justify-between py-1.5 text-sm">
                  <span>{item.categoryName}</span>
                  <span className="tabular-nums text-[#555]">{item.count}건</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ── Comment overview ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#555]">댓글 현황</h2>

        <SectionCard title="최근 댓글">
          {stats.comments.recentComments.length === 0 ? (
            <EmptyNote text="최근 댓글이 없습니다." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {stats.comments.recentComments.map((comment) => (
                <li key={comment.id} className="py-2">
                  <p className="text-sm text-[#333]">{truncatePostBody(comment.body)}</p>
                  <p className="mt-0.5 text-xs text-[#888]">
                    {comment.author.displayName}
                    {' · '}
                    <Link href={`/posts/${comment.postId}`} className="underline">
                      게시글 보기
                    </Link>
                    {' · '}
                    <DateTimeText value={comment.createdAt} mode="relative" />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="이번 주 댓글 활동 사용자 Top 7">
          {stats.comments.mostActiveCommenters.length === 0 ? (
            <EmptyNote text="이번 주 댓글이 없습니다." />
          ) : (
            <ol className="divide-y divide-[#f0f0f0]">
              {stats.comments.mostActiveCommenters.map((item, i) => (
                <li key={item.displayName} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    <span className="mr-2 text-xs text-[#aaa]">{i + 1}.</span>
                    {item.displayName}
                  </span>
                  <span className="tabular-nums text-[#555]">{item.commentCount}개</span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard title="이번 주 댓글 많은 게시글 Top 7">
          {stats.comments.postsWithMostComments.length === 0 ? (
            <EmptyNote text="이번 주 댓글이 없습니다." />
          ) : (
            <ol className="divide-y divide-[#f0f0f0]">
              {stats.comments.postsWithMostComments.map((item, i) => (
                <li key={item.postId} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    <span className="mr-2 text-xs text-[#aaa]">{i + 1}.</span>
                    <Link href={`/posts/${item.postId}`} className="hover:underline">
                      {truncatePostBody(item.title)}
                    </Link>
                  </span>
                  <span className="tabular-nums text-[#555]">{item.commentCount}개</span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* ── Report overview ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#555]">신고 현황</h2>

        {/* Alert banner for pending reports */}
        {stats.kpi.pendingReports > 0 ? (
          <Link
            href="/moderator/reports"
            className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100"
          >
            <span>미확정 신고 내역이 있습니다.</span>
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
              {stats.kpi.pendingReports}건
            </span>
          </Link>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* By status */}
          <SectionCard title="신고 상태별">
            {stats.reports.byStatus.length === 0 ? (
              <EmptyNote text="신고 내역이 없습니다." />
            ) : (
              <ul className="divide-y divide-[#f0f0f0]">
                {stats.reports.byStatus.map((item) => (
                  <li key={item.status} className="flex items-center justify-between py-1.5 text-sm">
                    <span
                      className={
                        item.status === 'PENDING'
                          ? 'text-red-600'
                          : item.status === 'VALID'
                            ? 'text-blue-700'
                            : 'text-[#555]'
                      }
                    >
                      {item.label}
                    </span>
                    <span className="tabular-nums">{item.count}건</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* By reason */}
          <SectionCard title="신고 사유별 (게시글 신고 기준)">
            {stats.reports.byReason.length === 0 ? (
              <EmptyNote text="신고 사유 데이터가 없습니다." />
            ) : (
              <ul className="divide-y divide-[#f0f0f0]">
                {stats.reports.byReason.map((item) => (
                  <li key={item.reason} className="flex items-center justify-between py-1.5 text-sm">
                    <span>{item.reason}</span>
                    <span className="tabular-nums text-[#555]">{item.count}건</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Most reported posts */}
        <SectionCard title="신고 많은 게시글 Top 7">
          {stats.reports.mostReportedPosts.length === 0 ? (
            <EmptyNote text="신고된 게시글이 없습니다." />
          ) : (
            <ul className="divide-y divide-[#f0f0f0]">
              {stats.reports.mostReportedPosts.map((post) => (
                <li key={post.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <Link href={`/posts/${post.id}`} className="hover:underline">
                    {post.title ?? truncatePostBody(post.body)}
                  </Link>
                  <span className="shrink-0 tabular-nums text-red-600">
                    신고 {post._count.reports}건
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Recent pending reports */}
        <SectionCard title="최근 미확정 신고 (최대 10건)">
          {stats.reports.recentReports.length === 0 ? (
            <EmptyNote text="미확정 신고가 없습니다." />
          ) : (
            <>
              <ul className="divide-y divide-[#f0f0f0]">
                {stats.reports.recentReports.map((report) => (
                  <li key={report.id} className="py-2 text-sm">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                        {report.option.label}
                      </span>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                        미확정
                      </span>
                    </div>
                    <p className="mt-1 text-[#333]">
                      <Link href={`/posts/${report.targetPostId}`} className="hover:underline">
                        {report.targetLabel}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs text-[#888]">
                      신고자: {report.reporter.displayName}
                      {' · '}
                      <DateTimeText value={report.createdAt} mode="relative" />
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Link
                  href="/moderator/reports"
                  className="text-xs text-[#555] underline hover:text-[#1a1a1a]"
                >
                  신고 관리 페이지로 이동 →
                </Link>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* ── Kakao notification health ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#555]">카카오 알림 상태</h2>

        {/* Alert banner for long-pending */}
        {stats.kpi.kakaoLongPending > 0 ? (
          <Link
            href="/moderator/kakao-messages?status=PENDING"
            className="flex items-center justify-between rounded-xl border border-yellow-200 bg-[#fffde7] px-4 py-3 text-sm text-[#7a6000] shadow-sm transition hover:border-yellow-300 hover:bg-yellow-100"
          >
            <span>5분 이상 PENDING 상태인 메시지가 있습니다.</span>
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-semibold text-white">
              {stats.kpi.kakaoLongPending}건
            </span>
          </Link>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="대기 (전체)" value={stats.kpi.kakaoPending} />
          <KpiCard label="성공 (오늘)" value={stats.kpi.kakaoSuccessInRange} />
          <KpiCard label="실패 (오늘)" value={stats.kpi.kakaoFailedInRange} />
          <KpiCard label="장시간 대기 (5분+)" value={stats.kpi.kakaoLongPending} />
        </div>

        {/* Recent failed deliveries */}
        <SectionCard title="최근 실패 전송 (최대 7건)">
          {stats.kakao.recentFailed.length === 0 ? (
            <EmptyNote text="최근 실패한 카카오 전송이 없습니다." />
          ) : (
            <>
              <ul className="divide-y divide-[#f0f0f0]">
                {stats.kakao.recentFailed.map((delivery) => (
                  <li key={delivery.id} className="py-2 text-sm">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[#3730a3]">
                        {DELIVERY_TYPE_LABEL[delivery.deliveryType] ?? delivery.deliveryType}
                      </span>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                        실패
                      </span>
                      <span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[#555]">
                        시도 {delivery.attemptCount}회
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#555]">
                      수신자: {delivery.recipientUser.displayName}
                      {' · '}
                      <DateTimeText value={delivery.createdAt} mode="relative" />
                    </p>
                    {delivery.errorMessage ? (
                      <p className="mt-0.5 truncate text-xs text-red-600">{delivery.errorMessage}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Link
                  href="/moderator/kakao-messages?status=FAILED"
                  className="text-xs text-[#555] underline hover:text-[#1a1a1a]"
                >
                  카카오 알림 로그 페이지로 이동 →
                </Link>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    </section>
  );
}
