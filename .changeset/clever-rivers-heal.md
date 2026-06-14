---
"@musictron/app": patch
"@musictron/web": patch
---

Refresh the MusicKit developer token in place during playback and detect preview-only fallbacks so authorized streams do not silently degrade.

Treat Last.fm now-playing updates as best-effort telemetry so upstream Last.fm errors do not surface as playback failures.

Show user-facing playback errors for MusicKit load, authorization, DRM, license, and preview-only fallback failures.
