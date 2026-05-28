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

export function getSavedItems(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveItem(item: SavedItem): void {
  const items = getSavedItems();
  const existing = items.findIndex((i) => i.id === item.id);
  if (existing !== -1) {
    items[existing] = item;
  } else {
    items.unshift(item);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
