# AGENTS.md - Musictron

## Project Overview

Musictron is an Apple Music client built as a **pnpm monorepo** (Turborepo) targeting **both desktop and web**. The shared React UI lives in `packages/app`; thin host shells in `apps/desktop` (Electron) and `apps/web` (Next.js) mount it with platform-specific adapters. A lightweight API server (also in `apps/web`) generates MusicKit developer tokens so the client never holds the private key.

## Monorepo Structure

- `packages/app` — **Shared React 19 UI** (components, pages, stores, hooks, MusicKit integration). Platform-agnostic — no Electron or Next.js imports.
- `packages/ui` — Shared `cn()` utility and global CSS
- `packages/tsconfig` — Shared TypeScript configs (base, react)
- `apps/desktop` — **Electron + Vite host shell**. Thin entry point that provides an Electron `PlatformAdapter` and mounts `@musictron/app`.
- `apps/web` — **Next.js host shell + API server**. Mounts `@musictron/app` as a client-side SPA at `/` and serves the Elysia API (token generation) at `/api/*`.

### Platform Adapter Pattern

The shared app uses a `PlatformAdapter` interface (`packages/app/src/lib/platform.ts`) to abstract host-specific APIs (window controls, media keys, platform detection, title updates). Each host provides its own implementation:

- **Electron adapter** (`apps/desktop/src/main.tsx`): bridges to `window.electronAPI` (IPC to main process)
- **Browser adapter** (`apps/web/components/player-shell.tsx`): uses `document.title`, returns `'web'` as platform

An `AppConfig` object provides runtime configuration (server URL, developer token) that replaces the old Vite-specific `import.meta.env` references.

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
pnpm --filter @musictron/app typecheck

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
- Path aliases:
  - `@/*` → `packages/app/src/*` (shared app code — used in all packages)
  - `@web/*` → `./*` (web app's own files, used only in `apps/web`)
- All packages use `"type": "module"` (ESM)
- MusicKit JS type declarations live in `packages/app/src/types/musickit.d.ts`

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
- Use path aliases: `import { cn } from '@/lib/utils'` (in shared app code)
- Use `@web/` prefix for web-app-specific imports: `import { api } from '@web/lib/api'`
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
- **Never reference `window.electronAPI` directly** — always go through `getPlatformAdapter()` from `@/lib/platform`

### State Management (Zustand)

- Store shape: `create<StateInterface>()((set, get) => ({...}))`
- `persist` middleware with `partialize` to select persisted fields
- Async actions use `get()` to read current state
- External event listeners initialized via exported functions (`initializePlayerEvents`)
- Runtime config accessed via `getAppConfig()` instead of `import.meta.env`

### Styling

- **Tailwind CSS v3** with CSS custom properties (HSL color system, shadcn/ui theme)
- Dark mode via `class` strategy (`<html class="dark">` — always dark)
- Use `cn()` (clsx + tailwind-merge) for all dynamic class composition
- Never use inline styles in the shared app; Tailwind utilities only
- Each host app owns its own Tailwind config and PostCSS config, but all scan `packages/app/src/**` for class names

### Environment Variables

- Desktop (Vite): prefix with `VITE_` — `VITE_MUSICTRON_SERVER_URL`, `VITE_MUSICKIT_DEVELOPER_TOKEN` (passed to `setAppConfig()` at boot)
- Web (Next.js server): `MUSICKIT_KEY_ID`, `MUSICKIT_TEAM_ID`, `MUSICKIT_PRIVATE_KEY`
- The shared app **never** reads env vars directly — it receives config via `setAppConfig()`
- `.env.example` files exist in both apps; `.p8` key files are gitignored

## CI/CD

- **CI** (`.github/workflows/ci.yml`): runs on push to `main` and PRs; jobs: typecheck then build (Web + Desktop Vite-only)
- **Release** (`.github/workflows/release.yml`): push to `main`; uses Changesets for versioning; builds platform-specific desktop binaries; creates draft GitHub releases
- Node 22, pnpm, Ubuntu (CI); macOS/Windows/Linux matrix (release builds)

## Versioning

Uses **Changesets** (`@changesets/cli`). When making user-facing changes, run `pnpm changeset` to create a changeset file before committing.

## Git Workflow

- Never amend commits unless the user explicitly requests it
- Never force push unless the user explicitly requests it
