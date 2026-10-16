import { Injectable } from '@angular/core';

/**
 * Acesso seguro ao LocalStorage. Falhas (modo privado, cota excedida,
 * dados corrompidos) nunca interrompem a aplicação.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw === null || raw === undefined ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  write<T>(key: string, value: T): boolean {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}
