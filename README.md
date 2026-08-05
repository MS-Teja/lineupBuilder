# Lineup Studio

A broadcast-minded football tactics workspace for YouTube creators. Build a lineup, direct its movement, and export only the tactical artboard—not the editor chrome.

## What changed

- Director’s tactics desk: formation library, contextual player inspector, and 16:9/9:16 output frames.
- Clean lineup language: every player is a compact circular marker with a portrait/monogram, shirt number, and short name. Empty roles stay as a grey `+` circle.
- Keyframe timeline: capture the current lineup state, rename/retime cues, preview the sequence, and choose player-in, player-out, and formation-transition treatments.
- Export-first workflow: render the timeline as browser-native WebM video or a shareable GIF, with a PNG still export for a single frame.
- Real player directory: search names, clubs, or countries; results can carry a portrait, club, nationality, position, and shirt number.
- Practical controls: add, replace, remove, edit, hide/reveal, swap roles via drag and drop, and undo add/remove/replacement actions.
- Accessible motion: every animation respects `prefers-reduced-motion`.

## Animation and export

The animation rail is deliberately collapsed on load so the pitch remains the focus. Open **Animation & export** to:

- capture up to eight lineup keyframes;
- set each cue’s name and duration;
- choose `Lift`, `Fade`, `Scale`, or `None` for player entrances/exits;
- choose `Flow`, `Glide`, or `Cut` for formation changes;
- preview the full cue; and
- download a WebM video, GIF, or PNG.

WebM uses the browser’s `MediaRecorder` support, so Chromium-based browsers provide the best video-export experience. GIF is rendered entirely in-browser using `gifenc` and is intentionally size-limited for a practical share/download flow.

## Player data

The app works immediately with TheSportsDB’s public player lookup, with a local editable fallback if the network is unavailable. That makes the prototype usable on a static GitHub Pages deployment.

For a production channel, configure a server-side `/api/players` proxy and set its URL in the build environment:

```bash
VITE_PLAYER_DIRECTORY_URL=https://your-domain.example/api/players
```

The proxy should return this normalized shape:

```json
{
  "players": [
    {
      "id": "api-football-123",
      "name": "Player name",
      "photo": "https://...",
      "club": "Club",
      "country": "Country",
      "position": "Forward",
      "number": 9
    }
  ]
}
```

An API-Football proxy is the better production source: it keeps your private API key out of the Vite bundle, lets you cache requests, and provides richer current player data. The public fallback is intentionally best-effort. Use portrait and crest media only where you have the export rights; third-party image CORS restrictions can also affect PNG export.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints. Verify production output with:

```bash
npm run lint
npm run build
```

## Deploy

The project retains its GitHub Pages deploy script:

```bash
npm run deploy
```
