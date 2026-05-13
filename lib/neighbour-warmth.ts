export const NEIGHBOUR_WARMTH_MIN = 0;
export const NEIGHBOUR_WARMTH_MAX = 100;
export const NEIGHBOUR_WARMTH_DEFAULT = 36.5;

export const NEIGHBOUR_WARMTH_BASE_GAINS = {
  POST_LIKE_RECEIVED: 0.3,
  COMMENT_LIKE_RECEIVED: 0.5,
  BEST_COMMENT_SELECTED: 3.0,
} as const;

export function clampNeighbourWarmth(value: number): number {
  if (!Number.isFinite(value)) {
    return NEIGHBOUR_WARMTH_DEFAULT;
  }

  return Math.min(NEIGHBOUR_WARMTH_MAX, Math.max(NEIGHBOUR_WARMTH_MIN, value));
}

export function calculateWarmthGain(currentWarmth: number, baseGain: number): number {
  const multiplier = Math.max(0.03, 1 - currentWarmth / 100);
  return baseGain * multiplier;
}

export function adjustNeighbourWarmth(currentWarmth: number, baseDelta: number): number {
  const clampedCurrent = clampNeighbourWarmth(currentWarmth);
  if (baseDelta === 0) {
    return clampedCurrent;
  }

  const actualDelta =
    baseDelta > 0 ? calculateWarmthGain(clampedCurrent, baseDelta) : baseDelta;

  return clampNeighbourWarmth(clampedCurrent + actualDelta);
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
