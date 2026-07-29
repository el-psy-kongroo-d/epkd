export const GA_ID = import.meta.env.VITE_GA_ID ?? "";

export function initAnalytics(id: string): void {
  if (!id) return;
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  function gtag(..._args: unknown[]): void {
    w.dataLayer?.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
}
