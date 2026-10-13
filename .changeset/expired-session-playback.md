---
"@musictron/app": patch
---

Fix "Playback failed: undefined is not an object (evaluating 'e.id')" after the Apple Music sign-in expires, and renew the sign-in automatically. Clicking a library song while signed out now opens Apple's sign-in and plays the song once you're signed in. The app also re-checks the sign-in when you return to the window and clears one Apple no longer accepts, so your next click renews it. If the sign-in expires in between, the player shows "Apple Music session expired" with a "Sign in" button that renews it and retries the song.
