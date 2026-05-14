'use client';

import { useState } from 'react';

type WarmthLog = {
  id: string;
  reason: string;
  baseDelta: number;
  actualDelta: number;
  previousWarmth: number;
  newWarmth: number;
  createdAt: string;
};

const REASON_LABELS: Record<string, string> = {
  POST_LIKE_RECEIVED: '게시글 좋아요 받음',
  COMMENT_LIKE_RECEIVED: '댓글 좋아요 받음',
  BEST_COMMENT_SELECTED: '베스트 댓글 선정',
  VALID_POST_REPORT: '게시글 신고 확정',
  VALID_COMMENT_REPORT: '댓글 신고 확정',
  COORDINATOR_HOLDS: '운영진 보류',
  ADMIN_DELETES: '관리자 삭제',
  FALSE_REPORT: '허위 신고',
};

type WarmthLogViewerProps = {
  userId: string;
};

export function WarmthLogViewer({ userId }: WarmthLogViewerProps) {
  const [logs, setLogs] = useState<WarmthLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  async function loadLogs() {
    if (opened) {
      setOpened(false);
      return;
    }

    if (logs !== null) {
      setOpened(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}/warmth-logs`);
      if (!res.ok) {
        setError('로그를 불러오지 못했어요.');
        return;
      }
      const data = await res.json() as { logs: WarmthLog[] };
      setLogs(data.logs);
      setOpened(true);
    } catch {
      setError('로그를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[#f0f0f0] pt-3">
      <button
        type="button"
        onClick={loadLogs}
        disabled={loading}
        className="text-xs font-medium text-[#888] hover:text-[#555] transition"
      >
        {loading ? '불러오는 중…' : opened ? '온기 변동 로그 접기 ▲' : '온기 변동 로그 보기 ▼'}
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : null}

      {opened && logs !== null ? (
        <div className="mt-2">
          {logs.length === 0 ? (
            <p className="text-xs text-[#888]">온기 변동 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e8e8e8] text-left text-[#888]">
                    <th className="py-1 pr-3">일시</th>
                    <th className="py-1 pr-3">사유</th>
                    <th className="py-1 pr-3 text-right">기준 변동</th>
                    <th className="py-1 pr-3 text-right">실제 변동</th>
                    <th className="py-1 pr-3 text-right">변동 전</th>
                    <th className="py-1 text-right">변동 후</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#f5f5f5]">
                      <td className="py-1 pr-3 text-[#888] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-1 pr-3">
                        {REASON_LABELS[log.reason] ?? log.reason}
                      </td>
                      <td className={`py-1 pr-3 text-right font-medium ${log.baseDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {log.baseDelta >= 0 ? '+' : ''}{log.baseDelta.toFixed(2)}
                      </td>
                      <td className={`py-1 pr-3 text-right font-medium ${log.actualDelta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {log.actualDelta >= 0 ? '+' : ''}{log.actualDelta.toFixed(2)}°
                      </td>
                      <td className="py-1 pr-3 text-right text-[#555]">
                        {log.previousWarmth.toFixed(1)}°
                      </td>
                      <td className="py-1 text-right text-[#555]">
                        {log.newWarmth.toFixed(1)}°
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
