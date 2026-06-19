# @musictron/web

## 1.0.4

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

- Updated dependencies [[`9d705bd`](https://github.com/Zeryther/musictron/commit/9d705bdc86c015ad7aff64923597ca332b52ab6c)]:
  - @musictron/app@1.0.3

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
