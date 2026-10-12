---
"@musictron/app": patch
---

Fix clicking a song sometimes playing a later song instead. MusicKit drops unplayable songs from the queue, which shifted the start position; playback now starts from the clicked song by ID and shows an error if that song is unavailable.
