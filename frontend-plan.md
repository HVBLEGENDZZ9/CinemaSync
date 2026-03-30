# FRONTEND AGENT — CinemaSync
## Instructions for Claude Code

You are building the frontend for a private two-person synchronized video watching platform called **CinemaSync**. This is a personal tool for a couple in a long-distance relationship. It must feel premium, intentional, and intimate — not a startup product, not a SaaS dashboard.

---

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS v3 (utility-first, no component libraries)
- **Player**: `react-player` (handles YouTube URLs and direct video file URLs uniformly)
- **Realtime / Auth / DB**: `@supabase/supabase-js`
- **Routing**: `react-router-dom` v6
- **Icons**: `lucide-react` (minimal icon set only — do not bloat with icon libraries)
- **Upload**: Native browser File API with presigned URL flow (no third-party upload SDK)
- **Fonts**: Load via Google Fonts — use `'DM Mono'` for monospace/code elements and `'Figtree'` for body text. NOT Inter, NOT Roboto, NOT Space Grotesk.

---

## Design System

### Philosophy
Apple-esque minimalism but with a dark, futuristic atmosphere. Think: deep space, obsidian glass, cold blue-white light. Every element should feel considered. Negative space is intentional. Motion is subtle and purposeful.

### Color Palette (define as CSS variables in `index.css`)
```
--bg-base: #080a0f         (near-black, slightly blue-tinted)
--bg-surface: #0e1117      (cards, panels — slightly lighter)
--bg-elevated: #161b24     (hover states, active elements)
--border: #1e2535          (subtle borders — barely visible)
--border-active: #2e3f5c   (active/focused borders)
--text-primary: #e8edf5    (primary text — cool white)
--text-secondary: #5a6a82  (muted labels, timestamps)
--text-tertiary: #2e3f5c   (placeholder text)
--accent: #4f8ef7          (cold electric blue — primary action color)
--accent-dim: #1a2d4f      (accent background, subtle highlights)
--danger: #e05c5c          (errors, destructive actions)
--success: #3ecf8e         (online status, success states)
```

### Typography
- Body / UI text: `'Figtree'`, weights 400 and 500
- Monospaced / timestamps / status codes: `'DM Mono'`, weight 400
- Never use bold headings — the design relies on size contrast and spacing, not font weight
- Base font size: 14px. Scale: 12 / 14 / 16 / 20 / 28
- Line height: 1.6 for readable text, 1.2 for UI elements

### Motion
- All transitions: `150ms ease-out` for UI state changes (hover, focus, active)
- Page enter animations: single `opacity 0→1` + `translateY(6px → 0)` over `300ms ease-out`
- No bounce. No spring. No excessive animation.
- The video player area never animates — it is a stable, anchored element

### Spacing
- Use Tailwind's spacing scale consistently: base unit 4px
- Sections separated by 32px or 48px — generous breathing room
- Padding inside cards/panels: 20px all sides
- Do not crowd elements together

---

## Application Structure

```
src/
├── main.jsx
├── App.jsx                  (router setup, auth gate)
├── index.css                (CSS variables, global resets, font imports)
├── lib/
│   ├── supabase.js          (supabase client singleton)
│   └── sync.js              (all realtime sync logic — see Sync section)
├── hooks/
│   ├── useAuth.js           (subscribe to supabase auth state)
│   ├── useRoom.js           (room state from DB, late-join catch-up logic)
│   └── useSync.js           (subscribe to realtime channel, emit events)
├── pages/
│   ├── LoginPage.jsx
│   └── RoomPage.jsx         (the main player view — only page after login)
└── components/
    ├── VideoPlayer.jsx      (react-player wrapper with event hooks)
    ├── ControlBar.jsx       (play/pause, seek bar, volume — minimal)
    ├── UrlInput.jsx         (YouTube URL paste field)
    ├── Library.jsx          (uploaded video list)
    ├── UploadModal.jsx      (drag-and-drop file upload)
    └── PresenceIndicator.jsx (shows if partner is online)
```

---

## Pages

### LoginPage (`/`)

Layout: full viewport, centered single column. No navbar, no footer. Just the brand mark and the form.

- Brand mark: the word `SYNC` in `DM Mono`, letter-spacing 0.3em, `--text-secondary` color, 12px. This is the only "logo". No icon, no wordmark, no gradient text.
- Below it: a single-line description in `--text-secondary` at 13px. Something like "your private cinema."
- Form: two inputs stacked vertically — Username and Password. Each input has a `1px solid --border` border, transparent background, `--text-primary` text, `--accent` focus ring (1px, not the browser default). Rounded 6px.
- Single button below: full width, `--accent` background, `--bg-base` text, no border. Label: "Enter". On loading state, replace label with a subtle spinner (CSS-only, not a library component).
- Error state: single line of `--danger` colored text below the button. No toast, no modal.
- Do not show "forgot password", "sign up", or any other links. This is a private app.
- On successful auth, navigate to `/room`.

### RoomPage (`/room`)

This is the entire product. Everything lives on one screen. No tabs, no multi-page navigation.

**Layout — Desktop (primary target):**
```
┌─────────────────────────────────────────────────────────────┐
│  Top bar: brand mark (left) + partner presence (right)      │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│   VIDEO PLAYER               │   SIDEBAR                    │
│   (16:9, fills remaining     │   - URL input                │
│    vertical space)           │   - Library list             │
│                              │   - Upload button            │
│                              │                              │
├──────────────────────────────┤                              │
│   Control bar (below player) │                              │
└──────────────────────────────┴──────────────────────────────┘
```

Sidebar width: 300px fixed. Player takes all remaining horizontal space.

**Top Bar:**
- Left: `SYNC` brand mark, same style as login page
- Right: partner presence indicator — a small `8px` circle, `--success` green when partner is connected, `--text-tertiary` grey when offline. Beside it, their username in `--text-secondary` at 12px `DM Mono`. No label like "Partner:" — just their name.

**Video Player Area:**
- Background: pure `--bg-base` (black) when no video is loaded
- When no video loaded: centered empty state — a thin `+` icon from lucide and the text "Paste a URL or choose from library" in `--text-secondary` at 13px. Nothing else.
- `react-player` should fill 100% width and maintain 16:9 ratio
- Set `controls={false}` on react-player — you are building custom controls
- Player should be styled so no browser chrome shows through

**ControlBar (below player):**
- Height: 48px
- Background: `--bg-surface` with a `1px solid --border` top border
- Elements from left to right:
  - Play/Pause button: lucide icon, 18px, `--text-primary`, hover `--accent`
  - Current timestamp: `DM Mono` format `mm:ss / mm:ss`
  - Seek bar: full-width range input, custom styled — track `--border`, filled portion `--accent`, thumb a `10px` circle `--accent`. No default browser styling.
  - Volume button: lucide icon only (no slider initially — slider on hover/click)
- The seek bar is the widest element (flex-grow)
- Synced seek: when you seek, the bar reflects position in real time. Events are debounced to 300ms before broadcasting.

**Sidebar:**
- Background: `--bg-surface`
- `1px solid --border` left border separating it from player
- Padding: 20px
- Sections are separated by a `1px solid --border` horizontal rule

*Section 1 — URL Input:*
- Label: "YouTube" in `--text-secondary` uppercase 10px letter-spacing 0.1em
- Input: same style as login page inputs. Placeholder: `paste url`
- No button — load video on Enter key press. Show a subtle inline loading state while the URL is being validated.
- On load, the URL is broadcast to partner via realtime AND persisted to the room state in the DB

*Section 2 — Library:*
- Label: "Library" same style as above
- List of uploaded videos. Each item: filename truncated to fit, file size in `DM Mono` `--text-secondary`, a play button (lucide icon) on hover.
- Active/currently-playing video: left `2px solid --accent` border on the list item, `--accent-dim` background
- If library is empty: single line "No videos yet" in `--text-tertiary`
- Max height: takes remaining sidebar space, scrollable with custom thin scrollbar (`2px wide, --border-active color`)

*Section 3 — Upload:*
- Pinned to bottom of sidebar
- Single button: full width, `1px solid --border`, transparent background, `--text-secondary` text. Label: "Upload Video". Lucide upload icon to the left of the label.
- On click: opens `UploadModal`

**UploadModal:**
- Full viewport dark overlay: `rgba(8, 10, 15, 0.85)` backdrop
- Centered panel: `--bg-surface`, `1px solid --border`, rounded 12px, 480px wide, 300px tall
- Drag and drop zone fills the panel: dashed `1px --border` border inside, a lucide icon centered, text "Drop video file here" and below it "or click to browse" in `--text-tertiary`
- On drag-over: border changes to `--accent`, background to `--accent-dim`
- On file selected: show filename + file size, replace drop zone content with a progress bar
- Progress bar: `--bg-elevated` track, `--accent` fill, animated, no percentage label — just the bar
- On complete: auto-close modal, file appears in Library
- Escape key or clicking outside closes modal (unless upload in progress)
- No "Cancel" button clutter — just the X icon top-right in `--text-secondary`

---

## Sync Logic (critical — read carefully)

All sync logic lives in `src/lib/sync.js` and `src/hooks/useSync.js`.

### The Core Principle
Never trust client clocks for offset calculation. The Supabase Realtime message contains a `serverTimestamp` field. The receiving client computes the offset as `(Date.now() - serverTimestamp)` and adjusts the video seek position accordingly.

### Events to Sync
Every sync event is broadcast on a Supabase Realtime channel named `room:main`. Each event is a JSON object with a `type` field and a payload.

**Event types:**

`VIDEO_LOAD` — when a user pastes a URL or selects from library
- Payload: `{ url, sourceType: 'youtube' | 'file' }`
- Receiver: loads the same URL in their player, seeks to 0, pauses

`PLAY` — when user hits play
- Payload: `{ videoTimestamp: number, serverTimestamp: number }`
- Receiver: seeks to `videoTimestamp + (Date.now() - serverTimestamp) / 1000`, then plays

`PAUSE` — when user hits pause
- Payload: `{ videoTimestamp: number }`
- Receiver: seeks to `videoTimestamp`, pauses immediately

`SEEK` — when user drags the seek bar (debounced 300ms)
- Payload: `{ videoTimestamp: number, isPlaying: boolean }`
- Receiver: seeks to `videoTimestamp`, resumes play state to match `isPlaying`

`BUFFER_START` — when react-player fires `onBuffer`
- Payload: `{ videoTimestamp: number }`
- Receiver: pauses their player and shows a subtle buffering indicator on the UI

`BUFFER_END` — when react-player fires `onBufferEnd`
- Receiver: resumes playback (if both are ready)

### Preventing Echo
When your own player receives a sync event (e.g., you emitted PLAY), it will also receive it via the broadcast channel. Use a ref `isSyncing` — set it to `true` before programmatically calling `player.seekTo()` or `player.play()` from a received event. In your react-player event handlers (`onPlay`, `onPause`, `onSeek`), if `isSyncing === true`, skip broadcasting and reset the ref. This prevents infinite loops.

### Late Join / Catch-Up
When `RoomPage` mounts, before subscribing to realtime, fetch the current room state from the `rooms` table in Supabase. The row contains:
- `current_url` — what's currently loaded
- `is_playing` — boolean
- `last_timestamp` — float, video position at last update
- `last_updated_at` — ISO timestamp

Compute the catch-up position: if `is_playing` is true, add `(Date.now() - new Date(last_updated_at).getTime()) / 1000` to `last_timestamp`. Load the URL, seek to that position, and match the play state. This happens silently before the player becomes interactive.

---

## Auth Flow

- Use Supabase Auth with email/password. Usernames map to emails internally (e.g., store `username` as `${username}@cinemasync.local`). The user only ever sees "Username" and "Password" — never the word "email".
- On app load, `useAuth.js` checks `supabase.auth.getSession()`. If a session exists, redirect to `/room`. If not, stay on `/`.
- Protect `/room` with a route guard — unauthenticated access redirects to `/`.
- On logout: clear session, redirect to `/`. Add a small logout button in the top bar (lucide `LogOut` icon, 16px, `--text-tertiary`, hover `--danger`, no label).

---

## Upload Flow

- User picks a file in `UploadModal`
- Frontend calls a Supabase Edge Function (`/functions/v1/get-upload-url`) with the filename and content type
- Edge Function returns a presigned R2 PUT URL and the final public URL
- Frontend uploads directly to R2 using a `fetch` PUT request with the presigned URL, tracking upload progress via `XMLHttpRequest` (which supports `upload.onprogress`, unlike `fetch`)
- On success, frontend calls Supabase to insert a row into the `video_library` table: `{ user_id, filename, file_url, file_size_bytes }`
- Library component re-fetches (or uses a realtime subscription on the `video_library` table) to update without page refresh

---

## Environment Variables

The frontend expects the following in `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

These are the only env vars the frontend needs. R2 credentials never touch the frontend.

---

## What NOT to Build

- No chat / messaging feature
- No video quality selector
- No picture-in-picture toggle
- No keyboard shortcut system (keep it simple)
- No dark/light mode toggle (it's always dark)
- No notification system / toasts
- No profile page / settings page
- No "invite link" generation — this is a two-person private app

---

## Deployment

Give detailed instructions for deployment and the dev will take care of the rest.
