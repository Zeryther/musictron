---
"@musictron/app": patch
---

Fix "Unable to read body as JSON" playback failures when playing long song lists (e.g. Play All in Library → Songs). Long lists are now queued in batches of 25 instead of a single oversized MusicKit request.
