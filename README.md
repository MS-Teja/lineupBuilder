# Lineup Studio

A broadcast-minded football lineup editor for YouTube creators. Build an XI on the pitch, stage a reveal, and export the artboard as video, GIF or a 4K still, without any editor chrome.

## How it works

- **Work on the pitch.** Click an empty role to search for a player (or create a custom one with your own photo). Click a player for quick actions. Drag to reposition (snaps to teammates and a fine grid), or drop on a teammate to swap.
- **One inspector.** With nothing selected it shows lineup style and motion; select a player to edit details, photo crop and role; select a scene to rename or retime it.
- **Scenes.** The strip at the bottom is your timeline. Every scene is a full lineup state with its own formation, positions and who's visible. `+ Scene` duplicates the current one; **Reveal** builds a whole sequence in one click (one by one, line by line, or all at once). Drag thumbnails to reorder.
- **Edit scope.** "Pitch edits apply to" decides whether formation, role and position changes hit all scenes or only the selected one, so you can animate a 4-4-2 shifting into a 3-5-2.
- **What you see is what you export.** The stage, thumbnails, preview playback and every export are drawn by the same canvas renderer.
- **Saved automatically** in this browser, with full undo/redo.

### Shortcuts

| Key | Action |
| --- | --- |
| Space | Play / stop |
| ⌘Z / ⇧⌘Z (Ctrl+Z / Ctrl+Y) | Undo / redo |
| Delete | Remove selected player |
| H | Hide / show selected player in this scene |
| Arrow keys (Shift ×5) | Nudge selected player |
| Alt + ← / → | Previous / next scene |
| Esc | Close popover, deselect |

## Export

- **Video**: MP4 where the browser can record it, otherwise WebM; 1920×1080 (or 1080×1920) at 30 fps. Rendered in real time with `MediaRecorder`, so keep the tab in front; Chromium browsers work best.
- **GIF**: 1280 px on the long side at 12 fps, encoded in-browser with `gifenc`.
- **PNG**: the selected scene at 3840×2160 (or 2160×3840).

## Player data

Search merges TheSportsDB's free API, Wikipedia and a small local catalogue, so it works on a static GitHub Pages deployment. For a production channel, put a server-side proxy in front of a richer source (e.g. API-Football) and point the build at it:

```bash
VITE_PLAYER_DIRECTORY_URL=https://your-domain.example/api/players
```

The proxy should return `{ "players": [{ "id", "name", "photo", "club", "country", "position", "number" }] }`. Only use portraits you have the rights to publish.

## Code map

```
src/
  state/      project model, reducer, undo/redo history, autosave, reveal presets
  render/     canvas renderer (pitch, players, scenes) and the shared playback timeline
  export/     PNG / GIF / video exporters
  stage/      live canvas, drag/select hit layer, snapping, on-pitch toolbar
  features/   topbar, inspector, players (search, photo), scenes (strip, reveal), export dialog, shortcuts
  ui/         buttons, segmented controls, sliders, popover, dialog, avatar, toast
  styles/     design tokens and base styles
```

## Run locally

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Deploy

```bash
npm run deploy   # builds and publishes dist/ to GitHub Pages
```
