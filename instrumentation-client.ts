function sendAnalytics(payload: Record<string, string | number>) {
  try {
    const body = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/analytics', body);
      return;
    }

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // no-op
  }
}

sendAnalytics({
  event: 'app_init',
  path: window.location.pathname,
});

export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse',
) {
  sendAnalytics({
    event: 'route_transition_start',
    url,
    navigationType,
    at: Date.now(),
  });
}
