const VERCEL_URL = "https://ai-data-copilot-sigma.vercel.app";

export function getApiBase(): string {
  if (typeof window === "undefined") return VERCEL_URL;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "";
  }
  return VERCEL_URL;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const base = getApiBase();
  const url = `${base}${path}`;
  return fetch(url, options);
}