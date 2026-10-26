## Design Context

### Users
YouTubers creating football content. The context of use is as a tool to aid in creating visually appealing YouTube videos. The primary emotion the interface should evoke is "professional" and "tactical precision" suited for broadcast/video formats.

### Brand Personality
**Three Words**: Professional, Side-Project, Tactical. 
**Voice/Tone**: The interface should feel like a serious tool for football analysis, focusing on clarity and visual impact for video content creation.

### Aesthetic Direction
**Theme/Style**: "Broadcast graphite": near-black neutral chrome (`--bg #0b0c0e`, `--surface #131417`, `--raised #1b1d21`) so the pitch is the only real colour on screen, with a single amber accent (`--accent #ffb020`) for actions and selection. All tokens live in `src/styles/tokens.css`; never hard-code colours in component CSS. The visuals prioritize legibility and contrast, crucial for being seen clearly on a YouTube video.

### Design Principles
1. **Video-First Clarity**: All elements on the pitch and sidebar must be highly legible when downscaled or compressed in a YouTube video. High contrast and clean typography (Outfit font) are essential.
2. **Professional Polish**: It's a side project, but it must look like a premium broadcast tool. Use distinct active states and the shadow tokens in `tokens.css` to elevate the design.
3. **Unhindered Utility**: The interface should stay out of the way of the content (the pitch and players). Controls in the inspector should be dense enough to be useful but clean enough not to distract.
4. **Smooth Interactions**: Given it's for video, animations (like the reveal presets) should be smooth and deliberate, not jarring, aiding in storytelling.

## Architecture

- **One renderer.** `src/render/` draws every frame on canvas: the live stage, scene thumbnails, playback and all exports. Never add a separate DOM rendering of the pitch; the preview must equal the export. Editor-only marks (empty slots, hidden-player ghosts, guides) are drawn only when `editor: true`.
- **Photos.** `render/photoFrame.js` (`photoRect`) places a photo in a marker from `profile.photoFrame` ({ zoom, x, y }); the canvas and DOM previews (`ui/FramedPhoto.jsx`) must both use it.
- **Animation.** `render/motion.js` plans each transition (who enters, exits, moves; stagger order) and samples it; `render/timeline.js` (`buildTimeline` / `sampleTimeline`) lays scenes out as [transition in][hold] and is the only source of frames for playback, scrubbing and exports. Each scene owns `transition: { duration, easing }`; `project.motion` holds entry/exit styles and stagger. Video encodes offline via WebCodecs (`mediabunny`, lazy-loaded), with `MediaRecorder` as fallback.
- **Transport.** `state/usePlayback.js` owns play/pause/seek. `ui.isPreviewing` means the stage paints the timeline at the shared `playhead` instead of the editable scene; any edit exits the preview.
- **State.** The project (`state/project.js`) is changed only through `state/reducer.js` actions dispatched via `useProject().dispatch`, which also handles undo/redo (`state/history.js`) and localStorage autosave. Ephemeral UI state (selection, popovers, playback) lives in `ui`, outside history.
- **Scenes.** The roster is shared by all scenes; each scene stores formation, per-slot role/position and visibility. Layout edits follow `ui.scope` ("all" scenes or just "this scene"); visibility is always per scene.
- **Styling.** Plain CSS: tokens in `styles/tokens.css`, primitives in `ui/controls.css`, one stylesheet per feature next to its component.
