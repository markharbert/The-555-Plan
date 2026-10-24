const KEY = '555_attribution';
type Attr = { source?: string; utm: Record<string, string> };

export function readAttribution(): Attr {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Attr;
  } catch {
    /* ignore */
  }
  return { utm: {} };
}

export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const prev = readAttribution();
    const utm = { ...prev.utm };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 200);
    });
    const source = prev.source || (params.get('source') || params.get('ref') || document.referrer || 'direct').slice(0, 500);
    sessionStorage.setItem(KEY, JSON.stringify({ source, utm }));
  } catch {
    /* ignore */
  }
}
