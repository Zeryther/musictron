# @musictron/desktop

## 1.0.3

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

## 1.0.2

### Patch Changes

- Updated dependencies [[`6475e39`](https://github.com/Zeryther/musictron/commit/6475e398fd9ce07ffba938c208039f969f5fbfe2)]:
  - @musictron/app@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [[`3124343`](https://github.com/Zeryther/musictron/commit/3124343c7859c9305bf4b1d9dbe9fb9a3cbdd9a0)]:
  - @musictron/app@1.0.1
