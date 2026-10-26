export const DEFAULT_LEAD_CATEGORIES: readonly string[] = [] as const;

export type DefaultLeadCategory = string;

const LEGACY_STORAGE_KEY = 'digitechzo_crm_custom_categories';
export const CATEGORIES_UPDATED_EVENT = 'digitechzo_categories_updated';

// In-memory runtime categories (persisted only in active React session memory, NOT in browser localStorage)
let memoryCustomCategories: string[] = [];

// Clean up any legacy business data inadvertently stored in localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore cleanup error
  }
}

/**
 * Get custom categories held in memory for the active session
 */
export const getCustomCategories = (): string[] => {
  return [...memoryCustomCategories];
};

/**
 * Add a runtime category in active memory and notify listeners
 */
export const addCustomCategory = (newCat: string): string[] => {
  const trimmed = newCat.trim();
  if (!trimmed) return getCustomCategories();

  const exists = memoryCustomCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (!exists) {
    memoryCustomCategories = [...memoryCustomCategories, trimmed];
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CATEGORIES_UPDATED_EVENT));
    }
  }
  return [...memoryCustomCategories];
};

/**
 * Remove a runtime category from active memory
 */
export const removeCustomCategory = (catToDelete: string): string[] => {
  const trimmed = catToDelete.trim().toLowerCase();
  if (!trimmed) return getCustomCategories();

  memoryCustomCategories = memoryCustomCategories.filter((c) => c.trim().toLowerCase() !== trimmed);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CATEGORIES_UPDATED_EVENT));
  }
  return [...memoryCustomCategories];
};

/**
 * Clear all runtime custom categories
 */
export const clearCustomCategories = (): void => {
  memoryCustomCategories = [];
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CATEGORIES_UPDATED_EVENT));
  }
};

/**
 * Get all available categories (in-memory + categories loaded directly from database records)
 */
export const getAllCategories = (extraCategories: (string | undefined | null)[] = []): string[] => {
  const custom = getCustomCategories();
  const validExtras = extraCategories
    .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    .map((c) => c.trim());

  const combined = [...custom, ...validExtras];

  // Deduplicate case-insensitively while preserving original casing
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of combined) {
    const lower = item.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(item);
    }
  }

  return result;
};
