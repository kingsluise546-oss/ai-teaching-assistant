/**
 * 简易内存限流 —— 按 IP 滑动窗口计数
 * 生产环境建议替换为 Redis-based 方案
 */

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

/** 默认：每 IP 每分钟最多 15 次请求 */
const DEFAULT_MAX = 15;
const DEFAULT_WINDOW_MS = 60_000;

/** 定期清理过期 IP（每 5 分钟），防止内存泄漏 */
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - DEFAULT_WINDOW_MS;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** 下次可请求的秒数（仅在 denied 时有效） */
  retryAfter?: number;
}

export function checkRateLimit(
  ip: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  // 清理窗口外记录
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);

  if (entry.timestamps.length > max) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  return { allowed: true };
}
