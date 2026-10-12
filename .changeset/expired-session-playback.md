---
"@musictron/app": patch
---

Fix "Playback failed: undefined is not an object (evaluating 'e.id')" when playing library songs after the Apple Music sign-in expired. Apple rejects the expired sign-in, and MusicKit failed with this cryptic error instead of reporting it. Now the app shows "Apple Music session expired", signs you out, and offers to sign in again. Playing library songs while signed out now shows "Sign in required" instead of trying and failing.
