# AGENTS.md - Musictron

## Project Overview

Musictron is a desktop Apple Music client built as a **pnpm monorepo** (Turborepo). The desktop app uses Electron + Vite + React; a lightweight Next.js API server generates MusicKit developer tokens so the client never holds the private key.

## Monorepo Structure

- `apps/desktop` — Electron + Vite + React 19 desktop app (MusicKit JS SDK)
- `apps/web` — Next.js 15 API server (Elysia mounted via catch-all route, ES256 JWT token generation)
- `packages/tsconfig` — Shared TypeScript configs (base, react)
- `packages/ui` — Shared `cn()` utility and global CSS

## Build / Dev / Typecheck Commands

Package manager: **pnpm** (v10.28.0). Always use `pnpm`, never npm or yarn.

```bash
# Install dependencies
pnpm install

# Dev (all apps concurrently via Turborepo)
pnpm dev

# Build everything
pnpm build

# Typecheck everything
pnpm typecheck

# Per-app commands (run from repo root)
pnpm --filter @musictron/desktop dev
pnpm --filter @musictron/desktop build
pnpm --filter @musictron/desktop typecheck
pnpm --filter @musictron/web dev
pnpm --filter @musictron/web build
pnpm --filter @musictron/web typecheck

# Desktop platform-specific builds
pnpm --filter @musictron/desktop build:mac
pnpm --filter @musictron/desktop build:win
pnpm --filter @musictron/desktop build:linux

# Clean all build artifacts
pnpm clean
```

## TypeScript Configuration

- **Strict mode** enabled everywhere (`strict: true`)
- Target: ES2022, Module: ESNext, Module resolution: bundler
- Desktop app uses **project references** (`tsconfig.app.json` for renderer, `tsconfig.node.json` for Electron main/preload)
- Path alias: `@/*` maps to `./src/*` (desktop) or `./*` (web)
- All packages use `"type": "module"` (ESM)

## Code Style Guidelines

### File Naming

- **kebab-case** for all files: `player-bar.tsx`, `auth-store.ts`, `use-keyboard-shortcuts.ts`
- Components: `.tsx`, pure logic: `.ts`

### Naming Conventions

- **Components**: PascalCase (`MainLayout`, `PlayerBar`, `MediaCard`)
- **Hooks**: camelCase with `use` prefix (`usePlayerStore`, `useKeyboardShortcuts`)
- **Zustand stores**: `use` prefix + `Store` suffix (`usePlayerStore`, `useAuthStore`)
- **Interfaces/Types**: PascalCase (`NowPlayingItem`, `PlayerState`, `ButtonProps`)
- **Helper functions**: camelCase (`formatTime`, `formatArtworkUrl`)
- **Constants**: SCREAMING_SNAKE_CASE for URLs/config values, camelCase for structural data (nav item arrays)
- **Internal store methods**: underscore prefix (`_syncFromMusicKit`, `_startTimeUpdater`)

### Imports

- Named imports preferred over default imports: `import { create } from 'zustand'`
- Use path aliases: `import { cn } from '@/lib/utils'`
- Use `import type` or inline `type` keyword for type-only imports:
  ```ts
  import type { NextConfig } from 'next'
  import { cva, type VariantProps } from 'class-variance-authority'
  ```
- Node built-ins with `node:` prefix in server code: `import crypto from 'node:crypto'`
- React imported as: `import React, { useEffect, useState } from 'react'` or `import * as React from 'react'` (shadcn-style UI primitives)
- Relative imports only for same-directory siblings: `import { Sidebar } from './sidebar'`

### Exports

- Named exports for all components and functions: `export function HomePage() {}`
- Only the root `App` component uses default export: `export default function App()`

### Component Patterns

- Page components: plain function components with named exports
- UI primitives follow **shadcn/ui** pattern: `React.forwardRef`, `cva()` for variants, `cn()` for class merging, `displayName` set on ref components
- Props defined as TypeScript interfaces directly above the component
- Zustand state destructured in components: `const { isPlaying, togglePlayPause } = usePlayerStore()`
- Use selectors for render optimization: `const isQueueOpen = usePlayerStore((s) => s.isQueueOpen)`

### State Management (Zustand)

- Store shape: `create<StateInterface>()((set, get) => ({...}))`
- `persist` middleware with `partialize` to select persisted fields
- Async actions use `get()` to read current state
- External event listeners initialized via exported functions (`initializePlayerEvents`)

### Styling

- **Tailwind CSS v3** with CSS custom properties (HSL color system, shadcn/ui theme)
- Dark mode via `class` strategy (`<html class="dark">` — always dark)
- Use `cn()` (clsx + tailwind-merge) for all dynamic class composition
- Never use inline styles in the desktop app; Tailwind utilities only

### Environment Variables

- Desktop (Vite): prefix with `VITE_` — `VITE_MUSICTRON_SERVER_URL`, `VITE_MUSICKIT_DEVELOPER_TOKEN`
- Web (Next.js server): `MUSICKIT_KEY_ID`, `MUSICKIT_TEAM_ID`, `MUSICKIT_PRIVATE_KEY`
- Access via `import.meta.env` (Vite) or `process.env` (Node.js/Next.js)
- `.env.example` files exist in both apps; `.p8` key files are gitignored

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs on push to `main` and PRs; jobs: typecheck then build (Web + Desktop Vite-only)
- **Release** (`.github/workflows/release.yml`): push to `main`; uses Changesets for versioning; builds platform-specific desktop binaries; creates draft GitHub releases
- Node 22, pnpm, Ubuntu (CI); macOS/Windows/Linux matrix (release builds)

## Versioning

Uses **Changesets** (`@changesets/cli`). When making user-facing changes, run `pnpm changeset` to create a changeset file before committing.
