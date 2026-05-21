import { prisma } from '@/lib/db/prisma';

export const REPUTATION_SETTING_DEFAULTS = {
  COMMUNITY_SCORE_DELTA_POST_LIKE_RECEIVED: 1.0,
  COMMUNITY_SCORE_DELTA_COMMENT_LIKE_RECEIVED: 1.2,
  COMMUNITY_SCORE_DELTA_BEST_COMMENT_SELECTED: 5.0,
  COMMUNITY_SCORE_DELTA_COORDINATOR_RESTORES: 3.0,
  COMMUNITY_SCORE_DELTA_ADMIN_RESTORES: 5.0,
  COMMUNITY_SCORE_DELTA_POST_REPORT_SUBMITTED: -2.0,
  COMMUNITY_SCORE_DELTA_COMMENT_REPORT_SUBMITTED: -2.5,
  COMMUNITY_SCORE_DELTA_COORDINATOR_HOLDS: -5.0,
  COMMUNITY_SCORE_DELTA_ADMIN_DELETES: -10.0,
  COMMUNITY_SCORE_POST_AUTO_HOLD_THRESHOLD: -8,
  COMMUNITY_SCORE_COMMENT_AUTO_HOLD_THRESHOLD: -5,
  NEIGHBOUR_WARMTH_DELTA_POST_LIKE_RECEIVED: 0.3,
  NEIGHBOUR_WARMTH_DELTA_COMMENT_LIKE_RECEIVED: 0.5,
  NEIGHBOUR_WARMTH_DELTA_BEST_COMMENT_SELECTED: 3.0,
  NEIGHBOUR_WARMTH_DELTA_VALID_POST_REPORT: -1.0,
  NEIGHBOUR_WARMTH_DELTA_VALID_COMMENT_REPORT: -1.2,
  NEIGHBOUR_WARMTH_DELTA_COORDINATOR_HOLDS: -3.0,
  NEIGHBOUR_WARMTH_DELTA_ADMIN_DELETES: -6.0,
  NEIGHBOUR_WARMTH_DELTA_FALSE_REPORT: -2.0,
  NEIGHBOUR_WARMTH_BASE_WARMTH: 36.5,
  NEIGHBOUR_WARMTH_MIN_WARMTH: 0,
  NEIGHBOUR_WARMTH_MAX_WARMTH: 100,
  NEIGHBOUR_WARMTH_GROWTH_CURVE: 1.6,
  NEIGHBOUR_WARMTH_DROP_CURVE: 1.4,
  GLOBAL_HOT_ENABLED: 0,
  GLOBAL_HOT_MIN_SCORE: 50,
} as const;

export type ReputationSettingKey = keyof typeof REPUTATION_SETTING_DEFAULTS;
export type ReputationSettingField = {
  key: ReputationSettingKey;
  label: string;
  description?: string;
  step?: string;
  section: 'community' | 'warmth-delta' | 'warmth-curve' | 'global-hot';
};

export const REPUTATION_SETTING_FIELDS: readonly ReputationSettingField[] = [
  { key: 'COMMUNITY_SCORE_DELTA_POST_LIKE_RECEIVED', label: '게시글 좋아요 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_COMMENT_LIKE_RECEIVED', label: '댓글 좋아요 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_BEST_COMMENT_SELECTED', label: '베스트 댓글 선정 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_COORDINATOR_RESTORES', label: '운영진 복구 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_ADMIN_RESTORES', label: '관리자 복구 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_POST_REPORT_SUBMITTED', label: '게시글 신고 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_COMMENT_REPORT_SUBMITTED', label: '댓글 신고 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_COORDINATOR_HOLDS', label: '운영진 보류 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_DELTA_ADMIN_DELETES', label: '관리자 삭제 점수 변화량', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_POST_AUTO_HOLD_THRESHOLD', label: '게시글 자동 HELD 기준값', step: '0.1', section: 'community' },
  { key: 'COMMUNITY_SCORE_COMMENT_AUTO_HOLD_THRESHOLD', label: '댓글 자동 HELD 기준값', step: '0.1', section: 'community' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_POST_LIKE_RECEIVED', label: '게시글 좋아요 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_COMMENT_LIKE_RECEIVED', label: '댓글 좋아요 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_BEST_COMMENT_SELECTED', label: '베스트 댓글 선정 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_VALID_POST_REPORT', label: '게시글 신고 확정 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_VALID_COMMENT_REPORT', label: '댓글 신고 확정 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_COORDINATOR_HOLDS', label: '운영진 보류 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_ADMIN_DELETES', label: '관리자 삭제 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_DELTA_FALSE_REPORT', label: '허위 신고 온기 변화량', step: '0.1', section: 'warmth-delta' },
  { key: 'NEIGHBOUR_WARMTH_BASE_WARMTH', label: '기준 온기(baseWarmth)', step: '0.1', section: 'warmth-curve' },
  { key: 'NEIGHBOUR_WARMTH_MIN_WARMTH', label: '최소 온기(minWarmth)', step: '0.1', section: 'warmth-curve' },
  { key: 'NEIGHBOUR_WARMTH_MAX_WARMTH', label: '최대 온기(maxWarmth)', step: '0.1', section: 'warmth-curve' },
  { key: 'NEIGHBOUR_WARMTH_GROWTH_CURVE', label: '증가 곡선(growthCurve)', step: '0.01', section: 'warmth-curve' },
  { key: 'NEIGHBOUR_WARMTH_DROP_CURVE', label: '감소 곡선(dropCurve)', step: '0.01', section: 'warmth-curve' },
  { key: 'GLOBAL_HOT_ENABLED', label: '글로벌핫 메뉴 활성화 (1=활성, 0=비활성)', step: '1', section: 'global-hot' },
  { key: 'GLOBAL_HOT_MIN_SCORE', label: '글로벌핫 최소 커뮤니티 점수', step: '0.1', section: 'global-hot' },
] as const;

const COMMUNITY_SCORE_REASON_TO_SETTING_KEY = {
  POST_LIKE_RECEIVED: 'COMMUNITY_SCORE_DELTA_POST_LIKE_RECEIVED',
  COMMENT_LIKE_RECEIVED: 'COMMUNITY_SCORE_DELTA_COMMENT_LIKE_RECEIVED',
  BEST_COMMENT_SELECTED: 'COMMUNITY_SCORE_DELTA_BEST_COMMENT_SELECTED',
  COORDINATOR_RESTORES: 'COMMUNITY_SCORE_DELTA_COORDINATOR_RESTORES',
  ADMIN_RESTORES: 'COMMUNITY_SCORE_DELTA_ADMIN_RESTORES',
  POST_REPORT_SUBMITTED: 'COMMUNITY_SCORE_DELTA_POST_REPORT_SUBMITTED',
  COMMENT_REPORT_SUBMITTED: 'COMMUNITY_SCORE_DELTA_COMMENT_REPORT_SUBMITTED',
  COORDINATOR_HOLDS: 'COMMUNITY_SCORE_DELTA_COORDINATOR_HOLDS',
  ADMIN_DELETES: 'COMMUNITY_SCORE_DELTA_ADMIN_DELETES',
} as const satisfies Record<string, ReputationSettingKey>;

const WARMTH_REASON_TO_SETTING_KEY = {
  POST_LIKE_RECEIVED: 'NEIGHBOUR_WARMTH_DELTA_POST_LIKE_RECEIVED',
  COMMENT_LIKE_RECEIVED: 'NEIGHBOUR_WARMTH_DELTA_COMMENT_LIKE_RECEIVED',
  BEST_COMMENT_SELECTED: 'NEIGHBOUR_WARMTH_DELTA_BEST_COMMENT_SELECTED',
  VALID_POST_REPORT: 'NEIGHBOUR_WARMTH_DELTA_VALID_POST_REPORT',
  VALID_COMMENT_REPORT: 'NEIGHBOUR_WARMTH_DELTA_VALID_COMMENT_REPORT',
  COORDINATOR_HOLDS: 'NEIGHBOUR_WARMTH_DELTA_COORDINATOR_HOLDS',
  ADMIN_DELETES: 'NEIGHBOUR_WARMTH_DELTA_ADMIN_DELETES',
  FALSE_REPORT: 'NEIGHBOUR_WARMTH_DELTA_FALSE_REPORT',
} as const satisfies Record<string, ReputationSettingKey>;

export type CommunityScoreReason = keyof typeof COMMUNITY_SCORE_REASON_TO_SETTING_KEY;
export type WarmthReason = keyof typeof WARMTH_REASON_TO_SETTING_KEY;

export type WarmthCurveConfig = {
  baseWarmth: number;
  minWarmth: number;
  maxWarmth: number;
  growthCurve: number;
  dropCurve: number;
};

function parseSettingValue(raw: string, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getReputationSettings(): Promise<Record<ReputationSettingKey, number>> {
  const keys = Object.keys(REPUTATION_SETTING_DEFAULTS) as ReputationSettingKey[];
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });

  const rowByKey = new Map(rows.map((row) => [row.key as ReputationSettingKey, row.value]));

  return keys.reduce<Record<ReputationSettingKey, number>>((acc, key) => {
    acc[key] = parseSettingValue(rowByKey.get(key) ?? '', REPUTATION_SETTING_DEFAULTS[key]);
    return acc;
  }, {} as Record<ReputationSettingKey, number>);
}

export async function getCommunityScoreDelta(reason: CommunityScoreReason): Promise<number> {
  const settings = await getReputationSettings();
  return settings[COMMUNITY_SCORE_REASON_TO_SETTING_KEY[reason]];
}

export async function getCommunityScoreConfig(reason: CommunityScoreReason): Promise<{
  baseDelta: number;
  postAutoHoldThreshold: number;
  commentAutoHoldThreshold: number;
}> {
  const settings = await getReputationSettings();
  return {
    baseDelta: settings[COMMUNITY_SCORE_REASON_TO_SETTING_KEY[reason]],
    postAutoHoldThreshold: settings.COMMUNITY_SCORE_POST_AUTO_HOLD_THRESHOLD,
    commentAutoHoldThreshold: settings.COMMUNITY_SCORE_COMMENT_AUTO_HOLD_THRESHOLD,
  };
}

export async function getCommunityAutoHoldThresholds(): Promise<{ post: number; comment: number }> {
  const settings = await getReputationSettings();
  return {
    post: settings.COMMUNITY_SCORE_POST_AUTO_HOLD_THRESHOLD,
    comment: settings.COMMUNITY_SCORE_COMMENT_AUTO_HOLD_THRESHOLD,
  };
}

export async function getWarmthDelta(reason: WarmthReason): Promise<number> {
  const settings = await getReputationSettings();
  return settings[WARMTH_REASON_TO_SETTING_KEY[reason]];
}

export async function getWarmthConfig(reason: WarmthReason): Promise<{
  baseDelta: number;
  curve: WarmthCurveConfig;
}> {
  const settings = await getReputationSettings();
  return {
    baseDelta: settings[WARMTH_REASON_TO_SETTING_KEY[reason]],
    curve: {
      baseWarmth: settings.NEIGHBOUR_WARMTH_BASE_WARMTH,
      minWarmth: settings.NEIGHBOUR_WARMTH_MIN_WARMTH,
      maxWarmth: settings.NEIGHBOUR_WARMTH_MAX_WARMTH,
      growthCurve: settings.NEIGHBOUR_WARMTH_GROWTH_CURVE,
      dropCurve: settings.NEIGHBOUR_WARMTH_DROP_CURVE,
    },
  };
}

export async function getWarmthCurveConfig(): Promise<WarmthCurveConfig> {
  const settings = await getReputationSettings();
  return {
    baseWarmth: settings.NEIGHBOUR_WARMTH_BASE_WARMTH,
    minWarmth: settings.NEIGHBOUR_WARMTH_MIN_WARMTH,
    maxWarmth: settings.NEIGHBOUR_WARMTH_MAX_WARMTH,
    growthCurve: settings.NEIGHBOUR_WARMTH_GROWTH_CURVE,
    dropCurve: settings.NEIGHBOUR_WARMTH_DROP_CURVE,
  };
}

export async function getGlobalHotSettings(): Promise<{ enabled: boolean; minScore: number }> {
  const settings = await getReputationSettings();
  return {
    enabled: settings.GLOBAL_HOT_ENABLED >= 1,
    minScore: settings.GLOBAL_HOT_MIN_SCORE,
  };
}
