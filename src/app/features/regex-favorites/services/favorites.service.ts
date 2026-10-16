import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { normalizeFlags } from '../../../shared/utils/regex-flags';

export interface Favorite {
  readonly id: string;
  readonly name: string;
  readonly pattern: string;
  readonly flags: string;
  readonly sampleText?: string;
  /** Data de criação em formato ISO 8601. */
  readonly createdAt: string;
}

export type FavoriteDraft = Pick<Favorite, 'name' | 'pattern' | 'flags' | 'sampleText'>;

export const FAVORITES_STORAGE_KEY = 'regexlab.favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly storage = inject(StorageService);
  private readonly items = signal<readonly Favorite[]>(this.restore());

  /** Favoritos ordenados do mais recente para o mais antigo. */
  readonly favorites = computed(() => [...this.items()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly count = computed(() => this.items().length);

  add(draft: FavoriteDraft): Favorite {
    const favorite: Favorite = { ...sanitize(draft), id: createId(), createdAt: new Date().toISOString() };
    this.commit([...this.items(), favorite]);
    return favorite;
  }

  update(id: string, draft: FavoriteDraft): void {
    this.commit(this.items().map((item) => (item.id === id ? { ...item, ...sanitize(draft) } : item)));
  }

  remove(id: string): void {
    this.commit(this.items().filter((item) => item.id !== id));
  }

  private commit(items: readonly Favorite[]): void {
    this.items.set(items);
    this.storage.write(FAVORITES_STORAGE_KEY, items);
  }

  private restore(): Favorite[] {
    const stored = this.storage.read<unknown>(FAVORITES_STORAGE_KEY, []);
    return Array.isArray(stored) ? stored.filter(isFavorite) : [];
  }
}

function sanitize(draft: FavoriteDraft): FavoriteDraft {
  const sampleText = draft.sampleText?.length ? draft.sampleText : undefined;
  return { name: draft.name.trim(), pattern: draft.pattern, flags: normalizeFlags(draft.flags), sampleText };
}

function isFavorite(value: unknown): value is Favorite {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item['id'] === 'string' &&
    typeof item['name'] === 'string' &&
    typeof item['pattern'] === 'string' &&
    typeof item['flags'] === 'string' &&
    typeof item['createdAt'] === 'string' &&
    (item['sampleText'] === undefined || typeof item['sampleText'] === 'string')
  );
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
