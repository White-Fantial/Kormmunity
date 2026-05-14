'use client';

import { useState } from 'react';

type ScoreEvent = {
  id: string;
  reason: string;
  baseDelta: number;
  weight: number;
  finalDelta: number;
  actorId: string | null;
  createdAt: string;
};

const REASON_LABELS: Record<string, string> = {
  POST_LIKE_RECEIVED: '게시글 좋아요 받음',
  COMMENT_LIKE_RECEIVED: '댓글 좋아요 받음',
  BEST_COMMENT_SELECTED: '베스트 댓글 선정',
  COORDINATOR_RESTORES: '운영진 복구',
  ADMIN_RESTORES: '관리자 복구',
  POST_REPORT_SUBMITTED: '게시글 신고 접수',
  COMMENT_REPORT_SUBMITTED: '댓글 신고 접수',
  COORDINATOR_HOLDS: '운영진 보류',
  ADMIN_DELETES: '관리자 삭제',
};

type ScoreLogViewerProps = {
  postId: string;
};

export function ScoreLogViewer({ postId }: ScoreLogViewerProps) {
  const [events, setEvents] = useState<ScoreEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  async function loadEvents() {
    if (opened) {
      setOpened(false);
      return;
    }

    if (events !== null) {
      setOpened(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}/score-logs`);
      if (!res.ok) {
        setError('로그를 불러오지 못했어요.');
        return;
      }
      const data = await res.json() as { events: ScoreEvent[] };
      setEvents(data.events);
      setOpened(true);
    } catch {
      setError('로그를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 border-t border-[#f0f0f0] pt-3">
      <button
        type="button"
        onClick={loadEvents}
        disabled={loading}
        className="text-xs font-medium text-[#888] hover:text-[#555] transition"
      >
        {loading ? '불러오는 중…' : opened ? '커뮤니티점수 로그 접기 ▲' : '커뮤니티점수 로그 보기 ▼'}
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}

      {opened && events !== null ? (
        <div className="mt-2">
          {events.length === 0 ? (
            <p className="text-xs text-[#888]">커뮤니티점수 변동 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-left text-[#888]">
                    <th className="py-1 pr-3">일시</th>
                    <th className="py-1 pr-3">사유</th>
                    <th className="py-1 pr-3 text-right">기준 변동</th>
                    <th className="py-1 pr-3 text-right">가중치</th>
                    <th className="py-1 text-right">최종 변동</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-[#f5f5f5]">
                      <td className="py-1 pr-3 text-[#888] whitespace-nowrap">
                        {new Date(event.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-1 pr-3">
                        {REASON_LABELS[event.reason] ?? event.reason}
                      </td>
                      <td className={`py-1 pr-3 text-right font-medium ${event.baseDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {event.baseDelta >= 0 ? '+' : ''}{event.baseDelta.toFixed(2)}
                      </td>
                      <td className="py-1 pr-3 text-right text-[#555]">
                        {event.weight.toFixed(2)}x
                      </td>
                      <td className={`py-1 text-right font-medium ${event.finalDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {event.finalDelta >= 0 ? '+' : ''}{event.finalDelta.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
