export const NEIGHBOUR_WARMTH_MIN = 0;
export const NEIGHBOUR_WARMTH_MAX = 100;
export const NEIGHBOUR_WARMTH_DEFAULT = 36.5;

export const NEIGHBOUR_WARMTH_BASE_GAINS = {
  POST_LIKE_RECEIVED: 0.3,
  COMMENT_LIKE_RECEIVED: 0.5,
  BEST_COMMENT_SELECTED: 3.0,
} as const;

export const NEIGHBOUR_WARMTH_BASE_DEDUCTIONS = {
  VALID_POST_REPORT: -1.0,
  VALID_COMMENT_REPORT: -1.2,
  COORDINATOR_HOLDS: -3.0,
  ADMIN_DELETES: -6.0,
  FALSE_REPORT: -2.0,
} as const;

export type NeighbourWarmthAdjustmentConfig = {
  baseWarmth: number;
  minWarmth: number;
  maxWarmth: number;
  growthCurve: number;
  dropCurve: number;
};

export const DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG: NeighbourWarmthAdjustmentConfig = {
  baseWarmth: NEIGHBOUR_WARMTH_DEFAULT,
  minWarmth: NEIGHBOUR_WARMTH_MIN,
  maxWarmth: NEIGHBOUR_WARMTH_MAX,
  growthCurve: 1.6,
  dropCurve: 1.4,
};

function normalizeConfig(config?: NeighbourWarmthAdjustmentConfig): NeighbourWarmthAdjustmentConfig {
  if (!config) {
    return DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG;
  }

  const minWarmth = Number.isFinite(config.minWarmth)
    ? config.minWarmth
    : DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG.minWarmth;
  const maxWarmth = Number.isFinite(config.maxWarmth)
    ? Math.max(config.maxWarmth, minWarmth)
    : DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG.maxWarmth;
  const baseWarmth = Number.isFinite(config.baseWarmth)
    ? Math.min(maxWarmth, Math.max(minWarmth, config.baseWarmth))
    : DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG.baseWarmth;
  const growthCurve = Number.isFinite(config.growthCurve)
    ? Math.max(0, config.growthCurve)
    : DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG.growthCurve;
  const dropCurve = Number.isFinite(config.dropCurve)
    ? Math.max(0, config.dropCurve)
    : DEFAULT_NEIGHBOUR_WARMTH_ADJUSTMENT_CONFIG.dropCurve;

  return {
    baseWarmth,
    minWarmth,
    maxWarmth,
    growthCurve,
    dropCurve,
  };
}

export function clampNeighbourWarmth(
  value: number,
  config?: NeighbourWarmthAdjustmentConfig,
): number {
  const resolvedConfig = normalizeConfig(config);
  if (!Number.isFinite(value)) {
    return resolvedConfig.baseWarmth;
  }

  return Math.min(resolvedConfig.maxWarmth, Math.max(resolvedConfig.minWarmth, value));
}

export function calculateWarmthDelta(
  currentWarmth: number,
  baseDelta: number,
  config?: NeighbourWarmthAdjustmentConfig,
): number {
  if (baseDelta === 0) {
    return 0;
  }

  const resolvedConfig = normalizeConfig(config);
  const clampedCurrent = clampNeighbourWarmth(currentWarmth, resolvedConfig);

  if (baseDelta > 0) {
    const denominator = resolvedConfig.maxWarmth - resolvedConfig.baseWarmth;
    if (denominator <= 0) {
      return 0;
    }

    const ratio = Math.max(0, (resolvedConfig.maxWarmth - clampedCurrent) / denominator);
    return baseDelta * Math.pow(ratio, resolvedConfig.growthCurve);
  }

  const denominator = resolvedConfig.baseWarmth - resolvedConfig.minWarmth;
  if (denominator <= 0) {
    return 0;
  }

  const ratio = Math.max(0, (clampedCurrent - resolvedConfig.minWarmth) / denominator);
  return baseDelta * Math.pow(ratio, resolvedConfig.dropCurve);
}

export function adjustNeighbourWarmth(
  currentWarmth: number,
  baseDelta: number,
  config?: NeighbourWarmthAdjustmentConfig,
): number {
  const resolvedConfig = normalizeConfig(config);
  const clampedCurrent = clampNeighbourWarmth(currentWarmth, resolvedConfig);
  const actualDelta = calculateWarmthDelta(clampedCurrent, baseDelta, resolvedConfig);
  return clampNeighbourWarmth(clampedCurrent + actualDelta, resolvedConfig);
}

export function getNeighbourWarmthLabel(warmth: number): string {
  const value = clampNeighbourWarmth(warmth);

  if (value < 30) return '새로 온 이웃';
  if (value < 50) return '따뜻한 이웃';
  if (value < 70) return '믿음 가는 이웃';
  if (value < 85) return '동네 해결사';
  return '모두가 아는 이웃';
}

export function formatNeighbourWarmth(warmth: number): string {
  return `이웃온기 ${clampNeighbourWarmth(warmth).toFixed(1)}°`;
}

export function formatNeighbourWarmthWithLabel(warmth: number): string {
  const clamped = clampNeighbourWarmth(warmth);
  return `${formatNeighbourWarmth(clamped)} · ${getNeighbourWarmthLabel(clamped)}`;
}
