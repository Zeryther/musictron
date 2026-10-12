---
"@musictron/app": patch
"@musictron/web": patch
"@musictron/desktop": patch
---

Fix stable volume playing at full volume with an unresponsive volume slider in Safari. Safari plays Apple Music audio directly instead of passing it through the browser's audio processing, so volume control now moves into the processing graph only once sound has actually been seen flowing through it, and returns to the player if processing fails.
