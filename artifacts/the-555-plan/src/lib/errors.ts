export function errMsg(e: unknown, fallback = 'That did not save. Please try again.'): string {
  const x = e as { data?: { error?: unknown }; message?: unknown } | null;
  if (x?.data && typeof x.data.error === 'string') return x.data.error;
  return fallback;
}
