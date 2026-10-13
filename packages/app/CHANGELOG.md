# @musictron/app

## 1.1.0

### Minor Changes

- Add an experimental "Stable volume" setting that evens out loud and quiet moments within a song, like YouTube's Stable Volume. It routes MusicKit's audio through a Web Audio compressor. Some browsers mute protected audio when it's processed, so a watchdog turns the feature off after 8 seconds of silent playback and asks you to reload. Off by default; find it under Settings → Playback. ([#15](https://github.com/Zeryther/musictron/pull/15))

- UI scaling and design cleanup: ([#11](https://github.com/Zeryther/musictron/pull/11))
  - Fluid typography: the Tailwind type scale (`text-2xs`–`text-4xl`) now uses `clamp()` and grows smoothly between 1280px and 1920px windows; all hardcoded pixel text classes migrated onto it
  - New "UI Scale" setting (90/100/110/125%) in Settings → Appearance, persisted and applied before first paint on both web and desktop
  - Media grids (library, browse, search, artist, radio) now reflow with `auto-fill` columns and fluid cards instead of fixed 180px flex-wrap rows
  - Light mode fixed: surface tints and borders now derive from the theme foreground instead of hardcoded white alphas
  - Shared Tailwind preset (`@musictron/app/tailwind-preset`) replaces the duplicated web/desktop configs; `rounded-xl`/`2xl` now follow the `--radius` token
  - New `Card` primitive and `.eyebrow` utility replace repeated hand-rolled shells and section labels; unified heading hierarchy (page h1 `3xl`, section `xl`, subsection `lg`)
  - Sidebar, player bar, queue panel, and icon dimensions converted to rem so the whole chrome follows the UI scale

- Add volume normalization so every song plays at a consistent loudness, like Apple's Sound Check. Musictron measures each track's loudness (ITU-R BS.1770 / EBU R128) from its unencrypted Apple Music preview, caches the result, and turns loud masters down to a chosen target (Quiet −20, Balanced −16, or Loud −12 LUFS) with a short fade. Upcoming queue items are measured ahead of time, and quieter tracks are never boosted. Toggle it under Settings → Playback (on by default). ([#15](https://github.com/Zeryther/musictron/pull/15))

### Patch Changes

- Fix "Unable to read body as JSON" playback failures when playing long song lists (e.g. Play All in Library → Songs). Long lists are now queued in batches of 25 instead of a single oversized MusicKit request. ([#12](https://github.com/Zeryther/musictron/pull/12))

- Fix "Playback failed: undefined is not an object (evaluating 'e.id')" after the Apple Music sign-in expires, and renew the sign-in automatically. Clicking a library song while signed out now opens Apple's sign-in and plays the song once you're signed in. The app also re-checks the sign-in when you return to the window and clears one Apple no longer accepts, so your next click renews it. If the sign-in expires in between, the player shows "Apple Music session expired" with a "Sign in" button that renews it and retries the song. ([#17](https://github.com/Zeryther/musictron/pull/17))

- Fix clicking a song sometimes playing a later song instead. MusicKit drops unplayable songs from the queue, which shifted the start position; playback now starts from the clicked song by ID and shows an error if that song is unavailable. ([#13](https://github.com/Zeryther/musictron/pull/13))

- Fix a batch of small bugs and polish items: ([#8](https://github.com/Zeryther/musictron/pull/8))
  - Browse: fix duplicate genre id so the "Chinese" tile loads Chinese charts instead of Rock
  - Last.fm scrobbling: treat rate-limit responses (code 29) as retryable so plays aren't dropped under load
  - Web API: deny cross-origin requests by default in production when `CORS_ORIGIN` is unset
  - Accessibility: add `aria-label`s to icon-only controls in the player bar, fullscreen player, song rows, media cards, and the playlist actions menu
  - Artist page: disable Play/Shuffle when the artist has no top songs
  - Search: clear the pending debounce timer on unmount
  - Remove dead code: unused `SongRow` props, unused `PUT`/`PATCH`/`DELETE` API route exports, unused `get-theme` IPC plumbing, legacy `apple-music-*` meta tags, and a stray `toast-close` attribute
  - Fix misleading comments in the React Query client config

- Make playlist and library-artist infinite scroll reliable. The scroll trigger now attaches whenever the list finishes loading (previously it could miss the first load until you navigated away and back), keeps loading while the bottom of the list is visible, and shows a "Try again" button if a page fails. Playlist pages also load with one request instead of two. ([#12](https://github.com/Zeryther/musictron/pull/12))

- Handle playlists that contain the same song more than once. Only the copy that is actually playing is highlighted now, instead of every copy. Playing such a playlist also keeps every copy in the queue: before, MusicKit kept only the last copy, so earlier songs could vanish from the queue or the wrong copy could start. ([#14](https://github.com/Zeryther/musictron/pull/14))

## 1.0.2

### Patch Changes

- Restore short-lived MusicKit developer tokens and refresh them in place during playback so authorized streams do not fall back to previews or stop at token expiry. ([#6](https://github.com/Zeryther/musictron/pull/6))

  Treat Last.fm now-playing updates as best-effort telemetry so upstream Last.fm errors do not surface as playback failures.

  Show user-facing playback errors for MusicKit load, authorization, DRM, license, and preview-only fallback failures.

## 1.0.1

### Patch Changes

- Keep playback from stopping when the MusicKit developer token expires. The server now mints long-lived (~6 month, configurable via `MUSICKIT_TOKEN_TTL_SECONDS`) developer tokens instead of 1-hour ones, and the client proactively refreshes the token ahead of expiry — only while playback is paused, so it never interrupts a song. ([#2](https://github.com/Zeryther/musictron/pull/2))
