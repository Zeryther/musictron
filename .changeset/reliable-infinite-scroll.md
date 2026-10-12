---
"@musictron/app": patch
---

Make playlist and library-artist infinite scroll reliable. The scroll trigger now attaches whenever the list finishes loading (previously it could miss the first load until you navigated away and back), keeps loading while the bottom of the list is visible, and shows a "Try again" button if a page fails. Playlist pages also load with one request instead of two.
