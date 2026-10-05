# Pazora

Pazora is a private, self-hosted streaming interface built on top of Jellyfin. It keeps Jellyfin as the media, metadata, user-state, and transcoding engine while replacing the default Jellyfin Web experience with a custom Netflix-style frontend and a security boundary designed for public remote access.

**Current release:** `1.0.0`  
**Current status:** Stable movie-first production release  
**Public app:** `inactive`  
**Jellyfin:** `inactive`

---

## Why Pazora exists

The project started with a working Jellyfin server that was already usable locally and remotely, but the goal was to build a separate product experience rather than simply restyle Jellyfin Web.

The original plan was to keep Jellyfin responsible for the difficult media-server concerns and build Pazora around it:

- use Jellyfin users, libraries, metadata, progress, favorites, playback sessions, subtitles, and transcoding
- build a custom premium browsing experience
- keep the permanent Jellyfin access token out of browser-visible code and URLs
- let media bytes travel directly through the media gateway instead of proxying movies through Next.js
- support desktop, mobile, touch, keyboard, and remote-style interaction
- keep one source of truth for Continue Watching, favorites, and playback history
- make the production stack restart automatically after a Windows reboot
- eventually add native TV clients such as Roku without creating a second media backend

The project moved from a basic Next.js bootstrap to a production-ready movie streaming application in staged phases, with each milestone validated before merge.

---

# Current architecture

```text
Browser / future native clients
          |
          | HTTPS
          v
https://media.domain .com
          |
          v
      Public Caddy :443
          |
          +------------------------------+
          |                              |
          | application/API traffic      | /Items/* and /Videos/*
          v                              v
     Pazora Next.js :3000          Pazora Gateway :8097
          |                              |
          | Jellyfin control APIs        | secure media authorization
          |                              |
          +---------------+--------------+
                          |
                          v
                    Jellyfin :8096
```

The public Caddy layer keeps two responsibilities separate:

- normal Pazora pages and API calls go to the Next.js application
- artwork and media requests go through the local Pazora/Jellyfin gateway

Jellyfin Web remains separately available at `jellyfin.[domain] .com`.

---

# Core security model

Pazora intentionally separates **control/API traffic** from **media traffic**.

## Authentication

The Pazora backend authenticates users against Jellyfin and stores the resulting session in server-managed HttpOnly cookies. Browser JavaScript does not receive the permanent Jellyfin access token.

## Playback authorization

When playback is prepared, Pazora generates a short-lived encrypted playback grant scoped to the selected media item and playback session.

The grant is validated by `/api/playback/authorize` before Caddy forwards protected `/Videos/*` resources to Jellyfin.

The grant is constrained by data such as:

- item identity
- media source
- play session
- audio stream
- subtitle profile
- quality/bitrate profile
- HLS resource path
- runtime/start constraints
- expiration

## Security invariants

These are architectural requirements, not implementation details:

1. The permanent Jellyfin user token must not be exposed to browser JavaScript.
2. The permanent Jellyfin token must not appear in client-visible media URLs.
3. Movie bytes must not pass through Next.js.
4. Next.js handles authentication, metadata, playback planning, and state updates.
5. Caddy/Jellyfin handle artwork and media delivery.
6. Future native clients should reuse the same backend and user state rather than creating a parallel media system.

---

# Technology stack

## Application

- Next.js `16.3.3`
- React `19.2.8`
- TypeScript
- Tailwind CSS 4
- `@jellyfin/sdk` `0.13.0`
- `hls.js` `1.7.1`

## Media server

- Jellyfin `10.11.11`

## Reverse proxy / playback gateway

- Caddy `2.11.4`

## Host

- Windows desktop server
- Windows services for Jellyfin, public Caddy, and the Pazora playback gateway
- Windows Scheduled Task for the Pazora production app

---

# Current product features

## Authentication and user state

- Jellyfin-backed login
- server-side authenticated sessions
- logout/session-expiration handling
- per-user Continue Watching
- per-user favorites / My List
- playback state synchronized back to Jellyfin

## Home / browse

- cinematic hero area
- horizontal media rows
- movie browsing
- personalized Continue Watching
- personalized favorites shelf
- personalized recommendations
- in-flow expanded media previews
- real Jellyfin artwork
- loading, failure, and recovery states

## Library and discovery

- Movies
- TV library UI foundation
- Collections
- Search
- pagination/search APIs
- title details
- similar-title discovery
- personalized recommendation shelves

## Player

- secure HLS playback
- HLS/fMP4 delivery
- H.264/AAC compatible transcoding profile
- Play / Pause
- seek timeline
- 10-second skip controls
- resume playback
- volume/mute
- playback-rate options
- quality switching
- audio track switching
- subtitle selection
- subtitle styling controls
- subtitle delay adjustment
- server-synchronized subtitle strategy
- playback recovery after network/media interruptions
- keyboard controls
- directional remote-style focus/navigation
- mobile/touch interaction
- standard browser fullscreen
- iPhone Safari native fullscreen fallback

## Resilience / production safeguards

- artwork failure recovery
- library request recovery
- playback recovery
- private/no-store handling for authenticated responses
- shallow and deep health endpoints
- Jellyfin reachability readiness check
- reboot-persistent production services

---

# Application routes

Current application routes include:

```text
/
/login
/browse
/movies
/tv
/collections
/my-list
/search
/title/[id]
/watch/[id]
```

Important API areas include:

```text
/api/auth/login
/api/auth/logout
/api/auth/session

/api/health
/api/jellyfin/status

/api/media/home
/api/media/items
/api/media/items/[id]
/api/media/items/[id]/episodes
/api/media/items/[id]/favorite
/api/media/search

/api/playback/items/[id]
/api/playback/authorize
/api/playback/state
```

---

# Playback model

The browser player does not receive a raw Jellyfin media token.

The high-level playback flow is:

```text
1. User opens /watch/[id]
2. Pazora loads Jellyfin media details
3. Pazora obtains Jellyfin playback information
4. Pazora chooses source/audio/subtitle/quality preferences
5. Pazora creates a short-lived encrypted playback grant
6. Browser loads HLS from media. .com
7. Gateway forward-auth validates the grant
8. Gateway injects the Jellyfin token upstream only
9. Jellyfin returns HLS playlists/segments
10. Browser reports start/progress/stop through /api/playback/state
11. Jellyfin remains the source of truth for Continue Watching
```

Current quality modes exposed by the playback API are:

```text
best
1080p
720p
480p
```

High-resolution sources can be constrained to a lower profile to avoid unnecessary client/network load.

---

# Subtitle strategy

Subtitle timing was treated as a first-class playback problem.

The current reliable baseline is server-synchronized subtitle rendering. When a selected subtitle requires it, Jellyfin transcodes the video with the subtitle rendered against the same media clock instead of depending entirely on browser-side subtitle timing.

Current selection logic prefers an appropriate default text subtitle and can prioritize English tracks while avoiding forced/accessibility variants when a better normal English track exists.

Native/client-side subtitle delivery can be revisited later, but only if synchronization remains reliable across clients.

---

# Production deployment

The production stack currently runs as:

```text
Windows Service: Caddy
  -> public HTTPS on :443

Windows Service: JellyfinServer
  -> Jellyfin on :8096

Windows Service: PazoraGateway
  -> playback/artwork gateway on :8097
  -> local Caddy admin endpoint on :2020

Scheduled Task: Pazora - Production App
  -> Next.js production server on :3000
```

The stack has been reboot-tested without manually reopening terminals.

A deep production readiness check is available through:

```text
https://media.  .com/api/health?deep=1
```

It validates the application configuration and live Jellyfin reachability.

---

# Media layout

The media root is organized by content type.

```text
C:\JellyFinMedia
├── Movies
├── TV Shows
├── Music
├── Photos
├── Home Videos
├── Books
├── Audiobooks
├── Live TV
└── Music Videos
```

Recommended movie layout:

```text
Movies\
  Movie Name (Year)\
    Movie Name (Year).mkv
    Movie Name (Year).eng.srt
```

Recommended TV layout:

```text
TV Shows\
  Series Name (Year)\
    Season 01\
      Series Name - S01E01.mkv
      Series Name - S01E02.mkv
```

Jellyfin remains responsible for metadata, artwork, generated trickplay images, and library scanning.

The presence of a filesystem folder does not automatically mean a corresponding Jellyfin library has been configured. Live TV also requires Jellyfin tuner/M3U/EPG configuration rather than simply a `Live TV` folder.

---

# Roadmap history

The roadmap below records both the original progression and the actual implementation state.

| Phase | Goal | Status | Result |
|---|---|---:|---|
| 0 | Project bootstrap | ✅ Complete | Next.js/TypeScript frontend initialized and repository established. |
| 1 | Jellyfin authentication foundation | ✅ Complete | Jellyfin login, session handling, secure cookies, and secret-safe logging. |
| 2 | Jellyfin media data foundation | ✅ Complete | Server-side Jellyfin context and media retrieval APIs. |
| 3 | Artwork, pagination, search, details APIs | ✅ Complete | Direct artwork delivery, pagination/search APIs, title details. |
| 4 | Pazora UI foundation | ✅ Complete | Netflix-style home, cards, hero, expanded previews, library browsing. |
| 5 | TV/search experience foundation | 🟡 Partial | TV library, series/seasons/episodes API/UI and search exist; full real-world episodic playback validation remains pending. |
| 6 | Secure playback foundation | ✅ Complete for movies | HLS/fMP4 playback, encrypted grants, Caddy forward-auth, Jellyfin state reporting. |
| 7 | Player UX and device polish | ✅ Complete | Audio/quality/subtitle controls, recovery, mobile/touch, keyboard and remote-style navigation. |
| 8 | Personalization | ✅ Complete | Resume-first Continue Watching, Jellyfin refresh, Favorites/My List. |
| 9 | Discovery | ✅ Complete | Similar titles and personalized home recommendations. |
| 10 | Media resilience | ✅ Complete | Library recovery, artwork resilience, playback recovery. |
| 11 | Production readiness | ✅ Complete | Secure response behavior, readiness safeguards, deep Jellyfin health checks. |
| 12 | Pazora 1.0.0 release | ✅ Complete | Movie-first production release merged and validated. |
| 13 | Public Pazora entrypoint | ✅ Complete | `media.  .com` serves Pazora and red P app icon. |
| 14 | iPhone Safari fullscreen | ✅ Complete | WebKit native-video fullscreen fallback added and runtime-tested on iPhone Safari. |

---

# Key implementation milestones

Selected milestones from the project history:

- `8252ffac` — initialize Life of Priya Media frontend
- `f0fca1fb` — merge Jellyfin authentication foundation
- `8cf56d40` — merge Jellyfin media data foundation
- `45b5bf15` — merge direct Jellyfin artwork delivery
- `87d0cb0d` — merge pagination and search APIs
- `984628b9` — merge media details APIs
- `401ead19` — merge Pazora UI foundation
- `651aebbe` — merge library browsing
- `b15dfa3f` — merge TV and search foundation
- `960e369d` — merge secure HLS playback
- `d38476d6` — merge player playback/subtitle UX
- `c27a809d` — merge player device polish and recovery
- `12473e7a` — merge Pazora 1.0.0 release
- `da38fe6b` — add public Pazora app icon
- `1a901f76` — add mobile/iPhone fullscreen support

---

# Current production status

## Validated

The movie-first production path has been validated for:

- authentication
- library browsing
- title details
- real Jellyfin artwork
- movie playback
- seeking
- resume / Continue Watching
- subtitle playback
- audio/quality switching
- favorites/My List
- recommendations
- public HTTPS routing
- playback authorization
- desktop browser use
- mobile/touch use
- iPhone Safari fullscreen
- automatic restart after Windows reboot
- deep health/Jellyfin readiness

## Intentionally not claimed as complete

The following are not considered fully production-complete yet:

- full TV-series/episode playback validation with a real episodic library
- Roku/native TV application
- Music experience
- Photos experience
- Home Videos experience
- Books/Audiobooks experience
- Music Videos experience
- Jellyfin Live TV UI inside Pazora

---

# Future roadmap

## Next web milestone — TV / episodic completion

The current codebase already contains TV, season, episode, and episode-playback foundations, but the original movie-first release deferred full runtime certification because suitable TV media was not available during development.

Future work:

- add/verify real TV media in Jellyfin
- validate series metadata matching
- validate season/episode ordering
- validate episode playback through the current secure transport
- verify episode resume positions
- verify Continue Watching across episodes
- add Next Episode behavior
- add Previous Episode where useful
- validate subtitle/audio switching on episodes
- validate series recommendations
- test specials (`Season 00`)

An older `feature/pazora-episodic-playback` branch exists as historical work. It should not be blindly rebased or merged because it was created against an older codebase. Any useful work should be selectively inspected and ported onto current `main`.

## Native Roku client

A separate private Roku client is planned so Pazora can run as a native sideloaded application on a TCL Roku TV.

The Roku app should:

- use Pazora as the visual/product source of truth
- use native Roku SceneGraph/BrightScript rather than attempting to run React/Next.js on Roku
- connect to the existing Pazora/Jellyfin backend
- preserve the playback security model
- share Jellyfin users, Continue Watching, favorites, and playback history
- use native Roku video playback
- support remote focus/navigation properly
- initially prove secure real-movie playback before implementing the complete UI

The Roku client should live in a separate repository/project rather than mixing native Roku application code into this web repository unless a small shared backend endpoint is required.

## Additional media types

Longer-term Pazora can expand beyond Movies and TV:

- Music
- Photos
- Home Videos
- Audiobooks
- Books where Jellyfin/library support is appropriate
- Music Videos
- Live TV / EPG

Each media type should be added only after the underlying Jellyfin library is configured and tested.

## Playback improvements

Potential future improvements:

- client-aware direct-play optimization where safe
- model/device playback profiles
- more efficient 4K/HDR handling
- optional native subtitle delivery after sync validation
- trickplay/seek preview thumbnails
- improved bitrate/quality selection
- richer playback diagnostics without exposing secrets
- better offline/network interruption UX

## Product / UX improvements

Potential future updates:

- more advanced TV-style focus handling in browser environments
- richer profile/user switching
- improved mobile layout polish
- enhanced accessibility
- improved loading skeletons
- more collection experiences
- better recommendation ranking
- optional PWA/installable web experience

## Operations / reliability

Future infrastructure work may include:

- automated public-IP/DNS update handling
- structured application/service logging
- uptime monitoring
- backup/restore documentation
- health alerting
- release/version automation
- automated test coverage around critical API/security behavior

---

# Development workflow

The project uses a branch/PR workflow. `main` should remain deployable.

Typical flow:

```text
main
  -> feature/fix/docs branch
  -> implementation
  -> static validation
  -> runtime validation
  -> stage only expected files
  -> commit
  -> push branch
  -> inspect PR scope
  -> merge
  -> fast-forward local main
  -> delete completed branch
```

Do not push directly to `main` for normal feature work.

Runtime behavior should be tested before a feature is committed when practical, especially for playback, networking, subtitles, mobile behavior, and production infrastructure.

---

# Local development

Install dependencies:

```bash
npm install
```

Run development mode:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

The application requires a reachable Jellyfin server and the expected environment configuration.

---

# Environment variables

The project uses variables such as:

```text
JELLYFIN_SERVER_URL
NEXT_PUBLIC_JELLYFIN_PUBLIC_URL
PAZORA_PLAYBACK_GRANT_SECRET
PAZORA_PROXY_AUTH_SECRET
```

Secret values must never be committed, printed into documentation, sent to browser code, or embedded in client applications.

See `.env.example` for configuration structure.

---

# Current priority order

As of the current `1.0.0` movie-first baseline, the recommended sequence for future work is:

```text
1. Preserve the stable movie production baseline
2. Build the private native Roku Pazora client
3. Complete real-world TV/episodic validation
4. Expand additional media types
5. Add playback and operational enhancements incrementally
```

Pazora should continue to evolve as a client/product layer around Jellyfin rather than becoming a replacement media server.

---

## License / distribution

Pazora is currently a private personal project and is not intended as a public hosted streaming service or Roku Channel Store release.
