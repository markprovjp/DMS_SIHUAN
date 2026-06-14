/** Sentry init helper.
 *  Load Sentry SDK dynamically (chỉ khi SENTRY_DSN set trong build env).
 *  Tránh bundle Sentry vào main chunk khi không dùng.
 *
 *  Lưu ý: @sentry/browser là optional dep. Cài thủ công nếu muốn enable:
 *  pnpm --filter @dms-admin/web add @sentry/browser
 */
export function initSentry(): void {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN;
  if (!dsn) return;
  // Dynamic import với optional dep — dùng @vite-ignore để Vite không warning.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sentryModule = "@sentry/browser";
  import(/* @vite-ignore */ sentryModule)
    .then((Sentry: any) => {
      Sentry.init({
        dsn,
        environment: (import.meta as any).env?.MODE || "development",
        release: (import.meta as any).env?.VITE_APP_VERSION,
        tracesSampleRate: 0.2,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0,
        ignoreErrors: ["NetworkError when attempting to fetch resource"],
        beforeSend(event: any) {
          if (event.user?.email) {
            event.user.email = "[redacted]";
          }
          return event;
        },
      });
      (window as any).Sentry = Sentry;
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error("[Sentry] init failed (optional dep not installed?):", e);
    });
}
