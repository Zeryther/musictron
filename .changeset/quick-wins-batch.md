---
"@musictron/app": patch
"@musictron/web": patch
"@musictron/desktop": patch
---

Fix a batch of small bugs and polish items:

- Browse: fix duplicate genre id so the "Chinese" tile loads Chinese charts instead of Rock
- Last.fm scrobbling: treat rate-limit responses (code 29) as retryable so plays aren't dropped under load
- Web API: deny cross-origin requests by default in production when `CORS_ORIGIN` is unset
- Accessibility: add `aria-label`s to icon-only controls in the player bar, fullscreen player, song rows, media cards, and the playlist actions menu
- Artist page: disable Play/Shuffle when the artist has no top songs
- Search: clear the pending debounce timer on unmount
- Remove dead code: unused `SongRow` props, unused `PUT`/`PATCH`/`DELETE` API route exports, unused `get-theme` IPC plumbing, legacy `apple-music-*` meta tags, and a stray `toast-close` attribute
- Fix misleading comments in the React Query client config
