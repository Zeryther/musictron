# @musictron/web

## 1.1.0

### Minor Changes

- Add an experimental "Stable volume" setting that evens out loud and quiet moments within a song, like YouTube's Stable Volume. It routes MusicKit's audio through a Web Audio compressor. Some browsers mute protected audio when it's processed, so a watchdog turns the feature off after 8 seconds of silent playback and asks you to reload. Off by default; find it under Settings → Playback. ([#15](https://github.com/Zeryther/musictron/pull/15))

- Add volume normalization so every song plays at a consistent loudness, like Apple's Sound Check. Musictron measures each track's loudness (ITU-R BS.1770 / EBU R128) from its unencrypted Apple Music preview, caches the result, and turns loud masters down to a chosen target (Quiet −20, Balanced −16, or Loud −12 LUFS) with a short fade. Upcoming queue items are measured ahead of time, and quieter tracks are never boosted. Toggle it under Settings → Playback (on by default). ([#15](https://github.com/Zeryther/musictron/pull/15))

### Patch Changes

- Fix a batch of small bugs and polish items: ([#8](https://github.com/Zeryther/musictron/pull/8))
  - Browse: fix duplicate genre id so the "Chinese" tile loads Chinese charts instead of Rock
  - Last.fm scrobbling: treat rate-limit responses (code 29) as retryable so plays aren't dropped under load
  - Web API: deny cross-origin requests by default in production when `CORS_ORIGIN` is unset
  - Accessibility: add `aria-label`s to icon-only controls in the player bar, fullscreen player, song rows, media cards, and the playlist actions menu
  - Artist page: disable Play/Shuffle when the artist has no top songs
  - Search: clear the pending debounce timer on unmount
  - Remove dead code: unused `SongRow` props, unused `PUT`/`PATCH`/`DELETE` API route exports, unused `get-theme` IPC plumbing, legacy `apple-music-*` meta tags, and a stray `toast-close` attribute
  - Fix misleading comments in the React Query client config

- UI scaling and design cleanup: ([#11](https://github.com/Zeryther/musictron/pull/11))
  - Fluid typography: the Tailwind type scale (`text-2xs`–`text-4xl`) now uses `clamp()` and grows smoothly between 1280px and 1920px windows; all hardcoded pixel text classes migrated onto it
  - New "UI Scale" setting (90/100/110/125%) in Settings → Appearance, persisted and applied before first paint on both web and desktop
  - Media grids (library, browse, search, artist, radio) now reflow with `auto-fill` columns and fluid cards instead of fixed 180px flex-wrap rows
  - Light mode fixed: surface tints and borders now derive from the theme foreground instead of hardcoded white alphas
  - Shared Tailwind preset (`@musictron/app/tailwind-preset`) replaces the duplicated web/desktop configs; `rounded-xl`/`2xl` now follow the `--radius` token
  - New `Card` primitive and `.eyebrow` utility replace repeated hand-rolled shells and section labels; unified heading hierarchy (page h1 `3xl`, section `xl`, subsection `lg`)
  - Sidebar, player bar, queue panel, and icon dimensions converted to rem so the whole chrome follows the UI scale

- Updated dependencies [[`193651b`](https://github.com/Zeryther/musictron/commit/193651bd00b9fabfd21afc3a6946bfd3a37ad748), [`021ec76`](https://github.com/Zeryther/musictron/commit/021ec763bc0d9a6fca6865b413082dc89b548110), [`a417b7a`](https://github.com/Zeryther/musictron/commit/a417b7ac0a0a42f7894b84d064ae9f0d553b72ff), [`9d705bd`](https://github.com/Zeryther/musictron/commit/9d705bdc86c015ad7aff64923597ca332b52ab6c), [`718c0ec`](https://github.com/Zeryther/musictron/commit/718c0ecb956646cdda83d824d92b45f35ec4e76b), [`9aed24b`](https://github.com/Zeryther/musictron/commit/9aed24b57a457231b7becbb475ddccaaa0b73fa0), [`c7871a6`](https://github.com/Zeryther/musictron/commit/c7871a6918fa9756061fdb545bf14609e5c9eef1), [`579abe1`](https://github.com/Zeryther/musictron/commit/579abe13486c9b6dac01cf83319a66daa02a88d7), [`4be06e2`](https://github.com/Zeryther/musictron/commit/4be06e295af02e902c7e2271e24e661ffee54a7d)]:
  - @musictron/app@1.1.0

## 1.0.3

### Patch Changes

- Restore short-lived MusicKit developer tokens and refresh them in place during playback so authorized streams do not fall back to previews or stop at token expiry. ([#6](https://github.com/Zeryther/musictron/pull/6))

  Treat Last.fm now-playing updates as best-effort telemetry so upstream Last.fm errors do not surface as playback failures.

  Show user-facing playback errors for MusicKit load, authorization, DRM, license, and preview-only fallback failures.

- Updated dependencies [[`6475e39`](https://github.com/Zeryther/musictron/commit/6475e398fd9ce07ffba938c208039f969f5fbfe2)]:
  - @musictron/app@1.0.2

## 1.0.2

### Patch Changes

- Handle more MusicKit private key secret formats in production token generation. ([#4](https://github.com/Zeryther/musictron/pull/4))

## 1.0.1

### Patch Changes

- Keep playback from stopping when the MusicKit developer token expires. The server now mints long-lived (~6 month, configurable via `MUSICKIT_TOKEN_TTL_SECONDS`) developer tokens instead of 1-hour ones, and the client proactively refreshes the token ahead of expiry — only while playback is paused, so it never interrupts a song. ([#2](https://github.com/Zeryther/musictron/pull/2))

- Updated dependencies [[`3124343`](https://github.com/Zeryther/musictron/commit/3124343c7859c9305bf4b1d9dbe9fb9a3cbdd9a0)]:
  - @musictron/app@1.0.1
