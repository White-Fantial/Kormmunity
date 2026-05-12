export async function measureServerTiming<T>(
  label: string,
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_PERF_LOG === '1') {
      const elapsed = Math.round(performance.now() - startedAt);
      console.info(`[perf] ${label}: ${elapsed}ms`);
    }
  }
}
