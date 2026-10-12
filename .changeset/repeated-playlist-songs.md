---
"@musictron/app": patch
---

Handle playlists that contain the same song more than once. Only the copy that is actually playing is highlighted now, instead of every copy. Playing such a playlist also keeps every copy in the queue: before, MusicKit kept only the last copy, so earlier songs could vanish from the queue or the wrong copy could start.
