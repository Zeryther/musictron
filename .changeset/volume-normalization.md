---
"@musictron/app": minor
"@musictron/web": minor
"@musictron/desktop": minor
---

Add volume normalization so every song plays at a consistent loudness, like Apple's Sound Check. Musictron measures each track's loudness (ITU-R BS.1770 / EBU R128) from its unencrypted Apple Music preview, caches the result, and turns loud masters down to a chosen target (Quiet −20, Balanced −16, or Loud −12 LUFS) with a short fade. Upcoming queue items are measured ahead of time, and quieter tracks are never boosted. Toggle it under Settings → Playback (on by default).
