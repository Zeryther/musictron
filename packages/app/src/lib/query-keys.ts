// Centralized query key factory for React Query.
// Using a factory pattern so every key is a tuple built from a shared root,
// making invalidation, prefetching, and cache lookups consistent.

export const queryKeys = {
  // ── Catalog ──────────────────────────────────────────────
  charts: {
    all: ['charts'] as const,
    catalog: (limit: number) => ['charts', 'catalog', limit] as const,
    genre: (genreId: string) => ['charts', 'genre', genreId] as const,
  },

  search: {
    all: ['search'] as const,
    results: (term: string) => ['search', 'results', term] as const,
    hints: (term: string) => ['search', 'hints', term] as const,
  },

  albums: {
    all: ['albums'] as const,
    detail: (id: string) => ['albums', 'detail', id] as const,
  },

  artists: {
    all: ['artists'] as const,
    detail: (id: string) => ['artists', 'detail', id] as const,
    topSongs: (id: string) => ['artists', 'topSongs', id] as const,
    playlists: (id: string) => ['artists', 'playlists', id] as const,
  },

  playlists: {
    all: ['playlists'] as const,
    detail: (id: string) => ['playlists', 'detail', id] as const,
    tracks: (id: string) => ['playlists', 'tracks', id] as const,
  },

  radio: {
    all: ['radio'] as const,
    stations: () => ['radio', 'stations'] as const,
    featured: () => ['radio', 'featured'] as const,
  },

  // ── Library (user-specific, requires auth) ───────────────
  library: {
    all: ['library'] as const,
    songs: (offset: number) => ['library', 'songs', offset] as const,
    albums: (offset: number) => ['library', 'albums', offset] as const,
    artists: (offset: number) => ['library', 'artists', offset] as const,
    recentlyAdded: () => ['library', 'recentlyAdded'] as const,
    playlists: () => ['library', 'playlists'] as const,
  },

  // ── Personalized ────────────────────────────────────────
  recommendations: () => ['recommendations'] as const,
  recentlyPlayed: () => ['recentlyPlayed'] as const,
} as const
