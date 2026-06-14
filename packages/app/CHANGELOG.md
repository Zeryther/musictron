# @musictron/app

## 1.0.2

### Patch Changes

- Restore short-lived MusicKit developer tokens and refresh them in place during playback so authorized streams do not fall back to previews or stop at token expiry. ([#6](https://github.com/Zeryther/musictron/pull/6))

  Treat Last.fm now-playing updates as best-effort telemetry so upstream Last.fm errors do not surface as playback failures.

  Show user-facing playback errors for MusicKit load, authorization, DRM, license, and preview-only fallback failures.

## 1.0.1

### Patch Changes

- Keep playback from stopping when the MusicKit developer token expires. The server now mints long-lived (~6 month, configurable via `MUSICKIT_TOKEN_TTL_SECONDS`) developer tokens instead of 1-hour ones, and the client proactively refreshes the token ahead of expiry — only while playback is paused, so it never interrupts a song. ([#2](https://github.com/Zeryther/musictron/pull/2))
