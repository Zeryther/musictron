# @musictron/web

## 1.0.1

### Patch Changes

- Keep playback from stopping when the MusicKit developer token expires. The server now mints long-lived (~6 month, configurable via `MUSICKIT_TOKEN_TTL_SECONDS`) developer tokens instead of 1-hour ones, and the client proactively refreshes the token ahead of expiry — only while playback is paused, so it never interrupts a song. ([#2](https://github.com/Zeryther/musictron/pull/2))

- Updated dependencies [[`3124343`](https://github.com/Zeryther/musictron/commit/3124343c7859c9305bf4b1d9dbe9fb9a3cbdd9a0)]:
  - @musictron/app@1.0.1
