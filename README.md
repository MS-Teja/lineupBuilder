# Lineup Studio

A broadcast-minded football lineup editor for YouTube creators. Build an XI on the pitch, stage a reveal, and export the artboard as video, GIF or a 4K still, without any editor chrome.

## How it works

- **Work on the pitch.** Click an empty role to search for a player (or create a custom one with your own photo). Click a player for quick actions. Drag to reposition (snaps to teammates and a fine grid), or drop on a teammate to swap.
- **One inspector.** With nothing selected it shows lineup style and motion (including the name-label style: Broadcast, Pill or Clean); select a player to edit details, role and the name shown on the pitch; select a scene to rename or retime it.
- **Photo framing.** Drag the photo inside the circle to position it, scroll or use the slider to zoom (50–400%), or use Fill / Fit / Close-up. The dimmed area shows what's cropped. Pick a marker colour from the swatches or any custom colour.
- **Scenes.** The strip at the bottom is your timeline. Every scene is a full lineup state with its own formation, positions and who's visible. `+ Scene` duplicates the current one; **Reveal** builds a whole sequence in one click (one by one, line by line, or all at once). Drag thumbnails to reorder.
- **Transitions.** Each scene has its own transition in: length (0 = cut) and easing, edited from the chip between two scenes. Players who appear enter at their new spot (Pop, Lift, Drop, Fade), players who leave exit where they stand, and everyone else glides to their new position. Entrances stagger keeper → defence → midfield → attack. **Preview** plays just that transition.
- **Transport.** Play/pause continues from wherever you are; drag along the ruler to scrub any frame. Resting on a scene returns you to editing it.
- **Edit scope.** "Pitch edits apply to" decides whether formation, role and position changes hit all scenes or only the selected one, so you can animate a 4-4-2 shifting into a 3-5-2.
- **What you see is what you export.** The stage, thumbnails, preview playback and every export are drawn by the same canvas renderer.
- **Saved automatically** in this browser, with full undo/redo.

### Shortcuts

| Key | Action |
| --- | --- |
| Space | Play / pause |
| Home | Back to the start |
| ⌘Z / ⇧⌘Z (Ctrl+Z / Ctrl+Y) | Undo / redo |
| Delete | Remove selected player |
| H | Hide / show selected player in this scene |
| Arrow keys (Shift ×5) | Nudge selected player |
| Alt + ← / → | Previous / next scene |
| Esc | Close popover, leave preview, deselect |

## Export

- **Video**: MP4 at 1080p, 1440p or 4K, 30 or 60 fps, at upload-grade bitrates (≈18 Mbps for 1080p60, ≈72 Mbps for 4K60). Encoded frame by frame with WebCodecs ([mediabunny](https://mediabunny.dev)), so it's faster than real time with no dropped frames. Browsers without WebCodecs fall back to real-time `MediaRecorder` capture.
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
