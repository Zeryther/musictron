import { afterEach, vi } from 'vitest'

/**
 * Setup for the Node (`unit`) project.
 *
 * Zustand `persist` reads `localStorage` and the theme store touches
 * `document` at module-load time. The Node environment provides neither, so we
 * install minimal stubs purely so those modules import cleanly. Tests that need
 * real DOM behavior (component rendering, class toggling) run in the `ui`
 * (jsdom) project instead.
 */

class MemoryStorage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

const g = globalThis as typeof globalThis & {
  localStorage?: Storage
  matchMedia?: (query: string) => MediaQueryList
  document?: Document
}

if (!g.localStorage) {
  g.localStorage = new MemoryStorage() as unknown as Storage
}

if (!g.matchMedia) {
  g.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as (query: string) => MediaQueryList
}

if (!g.document) {
  const classList = {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false,
  }
  g.document = {
    documentElement: { classList },
  } as unknown as Document
}

afterEach(() => {
  globalThis.localStorage.clear()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
