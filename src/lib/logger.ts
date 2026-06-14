const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;
type Level = keyof typeof LEVELS;

const currentLevel: Level = process.env.NODE_ENV === "production" ? "warn" : "debug";

function log(level: Level, msg: string, data?: unknown) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const ts = new Date().toISOString().slice(11, 19);
  const prefix = `[${ts}][${level.toUpperCase()}]`;
  if (data !== undefined) {
    try { console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](prefix, msg, JSON.stringify(data)); }
    catch { console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](prefix, msg, String(data)); }
  } else {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](prefix, msg);
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => log("debug", msg, data),
  info: (msg: string, data?: unknown) => log("info", msg, data),
  warn: (msg: string, data?: unknown) => log("warn", msg, data),
  error: (msg: string, data?: unknown) => log("error", msg, data),
};
