"@musictron/app": patch
"@musictron/web": patch

Restore short-lived MusicKit developer tokens and refresh them in place during playback so authorized streams do not fall back to previews or stop at token expiry.

Treat Last.fm now-playing updates as best-effort telemetry so upstream Last.fm errors do not surface as playback failures.

Show user-facing playback errors for MusicKit load, authorization, DRM, license, and preview-only fallback failures.
