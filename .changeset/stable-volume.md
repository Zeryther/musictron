---
"@musictron/app": minor
"@musictron/web": minor
"@musictron/desktop": minor
---

Add an experimental "Stable volume" setting that evens out loud and quiet moments within a song, like YouTube's Stable Volume. It routes MusicKit's audio through a Web Audio compressor. Some browsers mute protected audio when it's processed, so a watchdog turns the feature off after 8 seconds of silent playback and asks you to reload. Off by default; find it under Settings → Playback.
