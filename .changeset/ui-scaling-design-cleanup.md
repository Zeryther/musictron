---
"@musictron/app": minor
"@musictron/web": patch
"@musictron/desktop": patch
---

UI scaling and design cleanup:

- Fluid typography: the Tailwind type scale (`text-2xs`–`text-4xl`) now uses `clamp()` and grows smoothly between 1280px and 1920px windows; all hardcoded pixel text classes migrated onto it
- New "UI Scale" setting (90/100/110/125%) in Settings → Appearance, persisted and applied before first paint on both web and desktop
- Media grids (library, browse, search, artist, radio) now reflow with `auto-fill` columns and fluid cards instead of fixed 180px flex-wrap rows
- Light mode fixed: surface tints and borders now derive from the theme foreground instead of hardcoded white alphas
- Shared Tailwind preset (`@musictron/app/tailwind-preset`) replaces the duplicated web/desktop configs; `rounded-xl`/`2xl` now follow the `--radius` token
- New `Card` primitive and `.eyebrow` utility replace repeated hand-rolled shells and section labels; unified heading hierarchy (page h1 `3xl`, section `xl`, subsection `lg`)
- Sidebar, player bar, queue panel, and icon dimensions converted to rem so the whole chrome follows the UI scale
