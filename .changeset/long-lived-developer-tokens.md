---
"@musictron/app": patch
"@musictron/web": patch
---

Default to Apple's maximum (~6 month) MusicKit developer-token lifetime instead of 1 hour to stop recurring `MEDIA_LICENSE` playback interruptions.

Short-lived tokens caused playback to stop (with MusicKit's native `MEDIA_LICENSE` dialog) roughly once per hour, fixable only by a full page reload. MusicKit JS captures the developer token at `configure()` time for its DRM/license pipeline, and the client's in-place token refresh only reaches catalog/library API calls — never the license pipeline. So the player kept using the original token and the next license acquisition failed once it expired. A long-lived token keeps the developer token valid for the entire session, avoiding mid-session expiry without a reconfigure (which previously broke authentication). Configurable via `MUSICKIT_TOKEN_TTL_SECONDS`.
