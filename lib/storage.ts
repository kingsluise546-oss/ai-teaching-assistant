export interface SavedItem {
  id: string;
  title: string;
  type: string;
  typeColor: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  favorited?: boolean;
}

const STORAGE_KEY = "ai-teaching-saved";
/** 单个 item 估算上限（约 5MB 总容量 / 保守估计每 item 50KB） */
const MAX_ITEMS = 80;

export function getSavedItems(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveItem(item: SavedItem): { success: boolean; error?: string } {
  try {
    const items = getSavedItems();
    const existing = items.findIndex((i) => i.id === item.id);
    if (existing !== -1) {
      items[existing] = item;
    } else {
      // 容量保护：超过上限则移除最旧项
      if (items.length >= MAX_ITEMS) {
        items.pop(); // 移除最早的一条
      }
      items.unshift(item);
    }
    const data = JSON.stringify(items);
    // 单次写入超过 4MB 拒绝（浏览器 localStorage 通常 5MB 上限）
    if (data.length > 4_000_000) {
      return { success: false, error: "内容过大，无法保存。请精简后重试。" };
    }
    localStorage.setItem(STORAGE_KEY, data);
    return { success: true };
  } catch (e: any) {
    // QuotaExceededError 等存储异常
    return { success: false, error: e?.name === "QuotaExceededError" ? "存储空间已满，请清理旧内容后重试。" : `保存失败：${e?.message || "未知错误"}` };
  }
}

export function deleteItem(id: string): void {
  const items = getSavedItems().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function toggleFavorite(id: string): void {
  const items = getSavedItems();
  const item = items.find((i) => i.id === id);
  if (item) {
    item.favorited = !item.favorited;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function getFavoriteItems(): SavedItem[] {
  return getSavedItems().filter((i) => i.favorited);
}

export function isFavorite(id: string): boolean {
  const item = getSavedItems().find((i) => i.id === id);
  return item?.favorited ?? false;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
