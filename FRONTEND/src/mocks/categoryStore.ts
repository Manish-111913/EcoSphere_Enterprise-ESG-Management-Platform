import { useEffect, useState } from 'react';

/**
 * Shared category master store.
 *
 * This is the single source of truth for CSR Activity Categories and Challenge
 * Categories. The /administration/categories screen reads and writes it, and the
 * CSR-activity + Challenge creation forms read from it — so a category added on
 * the admin screen shows up live in those forms (the "nothing hardcoded" demo).
 *
 * Backed by localStorage under `ecosphere_categories`, with an in-memory
 * subscription channel so components on the same page update reactively.
 */

export type CategoryType = 'csr' | 'challenge';

export interface CategoryItem {
  id: string;
  type: CategoryType;
  name: string;
  code: string;
  description: string;
  color: string;
  icon: string;
  status: 'Active' | 'Inactive';
}

const STORAGE_KEY = 'ecosphere_categories';

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  // CSR Activity Categories
  { id: 'cat-1', type: 'csr', name: 'Carbon Offsetting', code: 'OFFSET', description: 'Projects focused on neutralizing greenhouse gas emissions.', color: '#0EA5E9', icon: 'Leaf', status: 'Active' },
  { id: 'cat-2', type: 'csr', name: 'Zero Waste Initiatives', code: 'ZEROWASTE', description: 'Reducing plastic consumption and optimizing corporate recycling.', color: '#10B981', icon: 'Trash2', status: 'Active' },
  { id: 'cat-3', type: 'csr', name: 'Clean Energy Integration', code: 'CLEANENERGY', description: 'Transitioning workspace grids to solar, wind, or hydropower.', color: '#F59E0B', icon: 'Sun', status: 'Active' },
  { id: 'cat-4', type: 'csr', name: 'Employee Wellness', code: 'WELLNESS', description: 'Health, wellness, and mental fitness programs across business units.', color: '#EC4899', icon: 'Heart', status: 'Active' },
  { id: 'cat-5', type: 'csr', name: 'Community Impact', code: 'COMMUNITY', description: 'Local neighborhood outreach, planting, and volunteering activities.', color: '#8B5CF6', icon: 'Users', status: 'Active' },

  // Challenge Categories
  { id: 'cat-6', type: 'challenge', name: 'Pillar Challenge', code: 'PILLAR', description: 'Core strategic compliance campaigns aligning directly with ESG targets.', color: '#10B981', icon: 'Award', status: 'Active' },
  { id: 'cat-7', type: 'challenge', name: 'Monthly Blitz', code: 'BLITZ', description: 'Short high-intensity sprints driving healthy department competition.', color: '#EF4444', icon: 'Zap', status: 'Active' },
  { id: 'cat-8', type: 'challenge', name: 'Habit Builder', code: 'HABIT', description: 'Recurring micro-activities building lasting green routines.', color: '#3B82F6', icon: 'Activity', status: 'Active' },
  { id: 'cat-9', type: 'challenge', name: 'Department Quest', code: 'QUEST', description: 'Collaborative team missions focused on specific branch operations.', color: '#F59E0B', icon: 'Flag', status: 'Active' },
];

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): CategoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as CategoryItem[];
  } catch {
    /* fall through to seed */
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return DEFAULT_CATEGORIES;
}

function write(items: CategoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach(l => l());
}

export const categoryStore = {
  getAll(): CategoryItem[] {
    return read();
  },
  getByType(type: CategoryType): CategoryItem[] {
    return read().filter(c => c.type === type);
  },
  /** Active categories of a type — what creation forms should offer. */
  getActiveByType(type: CategoryType): CategoryItem[] {
    return read().filter(c => c.type === type && c.status === 'Active');
  },
  save(items: CategoryItem[]): void {
    write(items);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Live categories hook. Re-reads on mount (so navigating from the admin screen
 * to a creation form reflects new categories) and subscribes to same-page
 * writes and cross-tab `storage` events.
 */
export function useCategories(): CategoryItem[] {
  const [items, setItems] = useState<CategoryItem[]>(() => categoryStore.getAll());

  useEffect(() => {
    const refresh = () => setItems(categoryStore.getAll());
    const unsub = categoryStore.subscribe(refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => {
      unsub();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return items;
}
