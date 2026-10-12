import { Download, FileVideo, Film, LayoutPanelTop, Trash2, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import FormationPanel from './components/FormationPanel';
import MotionTimeline from './components/MotionTimeline';
import Pitch from './components/Pitch';
import PlayerDirectory from './components/PlayerDirectory';
import PlayerInspector from './components/PlayerInspector';
import { exportGif, exportStill, exportVideo } from './services/animationExport';
import {
  emptySlot,
  getFormation,
  initialSlots,
  parseFormationString,
} from './utils/formations';
import './App.css';

const accents = ['#c4a15b', '#d48657', '#c96f68', '#a8799b', '#7a7fad', '#548da0', '#579b81'];

const accentFor = (player) => {
  const code = [...(player.name || 'player')].reduce((total, character) => total + character.charCodeAt(0), 0);
  return accents[code % accents.length];
};

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const waitForPaint = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const makeScene = (slots, formationId, isCustomShape, customFormationInput) => ({
  formationId,
  isCustomShape,
  customFormationInput: customFormationInput || null,
  slots: slots.map((slot) => ({
    id: slot.id,
    positionId: slot.positionId,
    profile: slot.profile ? { ...slot.profile } : null,
    accent: slot.accent,
    isRevealed: slot.isRevealed,
    isRemoving: slot.isRemoving,
    customX: slot.customX ?? null,
    customY: slot.customY ?? null,
  })),
});

const materializeExportScene = (baseSlots, scene, orientation) => {
  const bySlotId = new Map(scene.slots.map((slot) => [slot.id, slot]));
  return {
    orientation,
    slots: baseSlots.map((slot) => {
      const state = bySlotId.get(slot.id);
      return {
        ...slot,
        positionId: state?.positionId ?? slot.positionId,
        // The current slot profile (with updated photo, name, shirt number) is always the single source of truth
        profile: slot.profile ? { ...slot.profile } : null,
        accent: slot.accent,
        isRevealed: state ? state.isRevealed : slot.isRevealed,
        isRemoving: false,
        customX: state?.customX !== undefined && state?.customX !== null ? state.customX : (slot.customX ?? null),
        customY: state?.customY !== undefined && state?.customY !== null ? state.customY : (slot.customY ?? null),
      };
    }),
  };
};

const hiddenOpeningScene = makeScene(
  initialSlots.map((slot) => ({ ...slot, isRevealed: false })),
  '4-3-3',
  false,
  null,
);

const defaultKeyframes = () => [
  {
    id: 'cue-opening',
    label: 'Opening',
    duration: 500,
    scene: hiddenOpeningScene,
  },
  {
    id: 'cue-full-xi',
    label: 'Full XI',
    duration: 900,
    scene: makeScene(initialSlots, '4-3-3', false),
  },
];

const fileStem = (formation, orientation) => `tactical-lineup-${formation.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${orientation}`;

function App() {
  const [formationId, setFormationId] = useState('4-3-3');
  const [isCustomShape, setIsCustomShape] = useState(false);
  const [customFormationInput, setCustomFormationInput] = useState('');
  const [slots, setSlots] = useState(initialSlots);
  const [selectedSlotId, setSelectedSlotId] = useState('slot-10');
  const [orientation, setOrientation] = useState('landscape');
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [keyframes, setKeyframes] = useState(defaultKeyframes);
  const [activeKeyframeId, setActiveKeyframeId] = useState('cue-full-xi');
  const [motion, setMotion] = useState({
    playerEntry: 'lift',
    playerExit: 'sink',
    formationTransition: 'flow',
    formationDuration: 520,
  });
  const [motionOverride, setMotionOverride] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportState, setExportState] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const removalTimers = useRef([]);
  const playbackToken = useRef(0);

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current);
    removalTimers.current.forEach((timer) => window.clearTimeout(timer));
    playbackToken.current += 1;
  }, []);

  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? slots[0];
  const baseFormation = getFormation(formationId);
  const formation = useMemo(() => (
    isCustomShape
      ? { ...baseFormation, label: 'Custom', detail: 'Manual role arrangement', eyebrow: 'Tactical adjustment' }
      : baseFormation
  ), [baseFormation, isCustomShape]);
  const isFull = slots.every((slot) => slot.profile);
  const isExporting = Boolean(exportState);
  const activeMotion = motionOverride ?? motion;

  const announce = (message, onUndo) => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, onUndo });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  };

  const applyScene = (scene) => {
    if (!scene) return;

    const bySlotId = new Map(scene.slots.map((slot) => [slot.id, slot]));
    setFormationId(scene.formationId);
    setIsCustomShape(scene.isCustomShape);
    setCustomFormationInput(scene.customFormationInput || '');
    setSlots((current) => current.map((slot) => {
      const next = bySlotId.get(slot.id);
      if (!next) return slot;
      const hasProfile = Boolean(slot.profile || next.profile);
      const isEntering = hasProfile && !slot.isRevealed && next.isRevealed;
      return {
        ...slot,
        positionId: next.positionId,
        profile: slot.profile ?? (next.profile ? { ...next.profile } : null),
        accent: slot.accent ?? next.accent,
        isRevealed: next.isRevealed,
        isRemoving: false,
        motionKey: isEntering ? slot.motionKey + 1 : slot.motionKey,
        customX: next.customX ?? null,
        customY: next.customY ?? null,
      };
    }));
  };

  const changeFormation = (nextFormationId) => {
    if (nextFormationId === formationId && !isCustomShape) return;

    const nextFormation = getFormation(nextFormationId);
    const previousLabel = formation.label;

    setFormationId(nextFormationId);
    setIsCustomShape(false);
    setCustomFormationInput('');
    setSlots((current) => current.map((slot, index) => ({
      ...slot,
      positionId: nextFormation.roles[index] ?? slot.positionId,
      customX: null,
      customY: null,
    })));
    announce(`${previousLabel} morphed into ${nextFormation.label}.`);
  };

  const applyCustomFormation = (inputString) => {
    const parsed = parseFormationString(inputString);
    if (!parsed) return;

    const previousLabel = formation.label;
    setFormationId(formationId); // keep the base id for fallback
    setIsCustomShape(true);
    setCustomFormationInput(inputString);
    setSlots((current) => current.map((slot, index) => ({
      ...slot,
      positionId: parsed.roles[index] ?? slot.positionId,
      customX: null,
      customY: null,
    })));
    announce(`${previousLabel} morphed into ${parsed.label}.`);
  };

  const overrideSlotRole = (slotId, newPositionId) => {
    setSlots((current) => current.map((slot) => (
      slot.id === slotId
        ? { ...slot, positionId: newPositionId, customX: null, customY: null }
        : slot
    )));
    setIsCustomShape(true);
    announce(`Role changed to ${newPositionId}.`);
  };

  const moveSlot = (sourceSlotId, destinationSlotId) => {
    setSlots((current) => {
      const source = current.find((slot) => slot.id === sourceSlotId);
      const destination = current.find((slot) => slot.id === destinationSlotId);

      if (!source || !destination) return current;

      return current.map((slot) => {
        if (slot.id === sourceSlotId) return { ...slot, positionId: destination.positionId, customX: destination.customX, customY: destination.customY };
        if (slot.id === destinationSlotId) return { ...slot, positionId: source.positionId, customX: source.customX, customY: source.customY };
        return slot;
      });
    });
    setIsCustomShape(true);
    announce('Roles swapped. This is now a custom shape.');
  };



  const selectSlot = (slotId) => {
    const slot = slots.find((item) => item.id === slotId);
    setSelectedSlotId(slotId);
    setActivePanel('player');
    setIsDirectoryOpen(!slot?.profile);
  };

  const toggleVisibility = (slotId) => {
    setSlots((current) => current.map((slot) => {
      if (slot.id !== slotId || !slot.profile) return slot;
      const isRevealed = !slot.isRevealed;
      return {
        ...slot,
        isRevealed,
        motionKey: isRevealed ? slot.motionKey + 1 : slot.motionKey,
      };
    }));
  };

  const assignPlayer = (player) => {
    const target = slots.find((slot) => slot.id === selectedSlotId) ?? slots[0];
    const previousSlot = target;
    const replacing = Boolean(previousSlot.profile);

    setSlots((current) => current.map((slot) => (
      slot.id === target.id
        ? {
            ...slot,
            profile: { ...player, number: player.number ?? slot.profile?.number ?? null },
            isRevealed: true,
            isRemoving: false,
            motionKey: slot.motionKey + 1,
            accent: accentFor(player),
          }
        : slot
    )));
    setIsDirectoryOpen(false);

    announce(
      replacing ? `${player.name} replaces ${previousSlot.profile.name}.` : `${player.name} added at ${target.positionId}.`,
      replacing
        ? () => setSlots((current) => current.map((slot) => (
          slot.id === target.id
            ? { ...previousSlot, positionId: slot.positionId, motionKey: slot.motionKey + 1 }
            : slot
        )))
        : () => setSlots((current) => current.map((slot) => (
          slot.id === target.id ? emptySlot(slot.id, slot.positionId, slot.motionKey + 1) : slot
        )))
    );
  };

  const updateSelectedPlayer = (profile) => {
    setSlots((current) => current.map((slot) => (
      slot.id === selectedSlot.id ? { ...slot, profile } : slot
    )));
    announce('Player details updated.');
  };

  const removePlayer = (slotId) => {
    const currentSlot = slots.find((slot) => slot.id === slotId);
    if (!currentSlot?.profile || currentSlot.isRemoving) return;

    setSlots((current) => current.map((slot) => (
      slot.id === slotId ? { ...slot, isRemoving: true } : slot
    )));

    const finalizeRemoval = () => {
      setSlots((current) => current.map((slot) => (
        slot.id === slotId ? emptySlot(slot.id, slot.positionId, slot.motionKey + 1) : slot
      )));
      announce(`${currentSlot.profile.name} moved off the board.`, () => {
        setSlots((current) => current.map((slot) => (
          slot.id === slotId
            ? { ...currentSlot, positionId: slot.positionId, isRemoving: false, motionKey: slot.motionKey + 1 }
            : slot
        )));
      });
    };

    if (reducedMotion()) {
      finalizeRemoval();
      return;
    }

    const timer = window.setTimeout(finalizeRemoval, 260);
    removalTimers.current.push(timer);
  };

  const clearAllPlayers = () => {
    const filledSlots = slots.filter((slot) => slot.profile && !slot.isRemoving);
    if (!filledSlots.length) return;

    const snapshot = slots.map((slot) => ({ ...slot }));

    setSlots((current) => current.map((slot) =>
      slot.profile ? emptySlot(slot.id, slot.positionId, slot.motionKey + 1) : slot
    ));
    setIsDirectoryOpen(false);

    announce(`${filledSlots.length} player${filledSlots.length > 1 ? 's' : ''} cleared from the XI.`, () => {
      setSlots(snapshot.map((slot) => ({ ...slot, motionKey: slot.motionKey + 2 })));
    });
  };

  const openPlayerSearch = () => {
    const vacantSlot = slots.find((slot) => !slot.profile);
    const target = vacantSlot ?? selectedSlot;
    setSelectedSlotId(target.id);
    setActivePanel('player');
    setIsDirectoryOpen(true);
    announce(vacantSlot ? `Choose a player for ${target.positionId}.` : `Choose a replacement for ${target.profile.name}.`);
  };

  const addKeyframe = () => {
    if (keyframes.length >= 8) {
      announce('Keep the cue to eight keyframes or fewer for a crisp export.');
      return;
    }

    const id = `cue-${Date.now()}`;
    const keyframe = {
      id,
      label: `Cue ${String(keyframes.length + 1).padStart(2, '0')}`,
      duration: 850,
      scene: makeScene(slots, formationId, isCustomShape, customFormationInput),
    };

    setKeyframes((current) => [...current, keyframe]);
    setActiveKeyframeId(id);
    announce('Current lineup state captured as a keyframe.');
  };

  const selectKeyframe = (keyframeId) => {
    const keyframe = keyframes.find((item) => item.id === keyframeId);
    if (!keyframe) return;
    setActiveKeyframeId(keyframeId);
    applyScene(keyframe.scene);
  };

  const removeKeyframe = (keyframeId) => {
    if (keyframes.length <= 1) return;
    const index = keyframes.findIndex((item) => item.id === keyframeId);
    const next = keyframes.filter((item) => item.id !== keyframeId);
    setKeyframes(next);
    if (activeKeyframeId === keyframeId) setActiveKeyframeId(next[Math.max(0, index - 1)].id);
  };

  const updateKeyframe = (keyframeId, patch) => {
    setKeyframes((current) => current.map((keyframe) => (
      keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe
    )));
  };

  const runTimeline = async () => {
    if (isPlaying || isExporting || !keyframes.length) return;

    const token = playbackToken.current + 1;
    playbackToken.current = token;
    setIsPlaying(true);

    const effectiveKeyframes = (keyframes.length === 2 && keyframes[0].id === 'cue-opening' && keyframes[1].id === 'cue-full-xi')
      ? [
          {
            ...keyframes[0],
            scene: makeScene(slots.map((s) => ({ ...s, isRevealed: false })), formationId, isCustomShape, customFormationInput),
          },
          {
            ...keyframes[1],
            scene: makeScene(slots, formationId, isCustomShape, customFormationInput),
          },
        ]
      : keyframes;

    try {
      for (let index = 0; index < effectiveKeyframes.length; index += 1) {
        if (playbackToken.current !== token) return;
        const keyframe = effectiveKeyframes[index];
        if (index === 0) setMotionOverride({ ...motion, formationTransition: 'cut', formationDuration: 1 });
        else setMotionOverride(null);
        applyScene(keyframe.scene);
        setActiveKeyframeId(keyframe.id);
        await waitForPaint();
        if (index === 0) setMotionOverride(null);
        await wait(reducedMotion() ? 0 : keyframe.duration);
      }
      announce('Animation preview complete.');
    } finally {
      if (playbackToken.current === token) {
        setMotionOverride(null);
        setIsPlaying(false);
      }
    }
  };

  const exportBoard = async () => {
    if (isExporting || isPlaying) return;
    const stem = fileStem(formation, orientation);
    setExportState({ format: 'png', progress: 15 });

    try {
      await exportStill({
        scene: materializeExportScene(slots, makeScene(slots, formationId, isCustomShape), orientation),
        filename: `${stem}.png`,
      });
      setExportState({ format: 'png', progress: 100 });
      announce('Current tactical frame exported as PNG.');
    } catch (error) {
      console.error('PNG export failed', error);
      announce(error.message || 'PNG export could not be completed.');
    } finally {
      setExportState(null);
    }
  };

  const exportTimeline = async (format) => {
    if (isExporting || isPlaying) return;

    const stem = fileStem(formation, orientation);
    setExportState({ format, progress: 0 });

    const effectiveKeyframes = (keyframes.length === 2 && keyframes[0].id === 'cue-opening' && keyframes[1].id === 'cue-full-xi')
      ? [
          {
            ...keyframes[0],
            scene: makeScene(slots.map((s) => ({ ...s, isRevealed: false })), formationId, isCustomShape, customFormationInput),
          },
          {
            ...keyframes[1],
            scene: makeScene(slots, formationId, isCustomShape, customFormationInput),
          },
        ]
      : keyframes;

    const frames = effectiveKeyframes.map((keyframe) => ({
      ...keyframe,
      scene: materializeExportScene(slots, keyframe.scene, orientation),
    }));

    const onProgress = ({ captured, total }) => {
      setExportState({ format, progress: Math.max(1, Math.round((captured / total) * 100)) });
    };

    try {
      if (format === 'gif') {
        await exportGif({
          frames,
          motion,
          onProgress,
          filename: `${stem}.gif`,
        });
        announce(`High-resolution GIF exported from ${keyframes.length} keyframes.`);
      } else {
        const extension = await exportVideo({
          frames,
          motion,
          onProgress,
          filenameBase: stem,
        });
        announce(`${extension === 'mp4' ? 'MP4' : 'WebM'} video exported from ${keyframes.length} keyframes.`);
      }
    } catch (error) {
      console.error(`${format} export failed`, error);
      announce(error.message || `${format.toUpperCase()} export could not be completed.`);
    } finally {
      setExportState(null);
    }
  };

  const togglePanel = (panel) => {
    if (activePanel === panel) {
      setActivePanel(null);
      if (panel === 'player') setIsDirectoryOpen(false);
      return;
    }

    setActivePanel(panel);
    if (panel !== 'player') setIsDirectoryOpen(false);
  };

  return (
    <div className="studio-app">
      <header className="studio-topbar">
        <div className="canvas-toolbar" aria-label="Canvas controls">
          <button
            type="button"
            className={`toolbar-button ${activePanel === 'formation' ? 'is-active' : ''}`}
            onClick={() => togglePanel('formation')}
            aria-pressed={activePanel === 'formation'}
          >
            <LayoutPanelTop size={16} />
            <span>Board</span>
          </button>
          <button
            type="button"
            className={`toolbar-button ${activePanel === 'player' ? 'is-active' : ''}`}
            onClick={() => togglePanel('player')}
            aria-pressed={activePanel === 'player'}
          >
            <UserRound size={16} />
            <span>Player</span>
          </button>
          <button
            type="button"
            className={`toolbar-button ${activePanel === 'motion' ? 'is-active' : ''}`}
            onClick={() => togglePanel('motion')}
            aria-pressed={activePanel === 'motion'}
          >
            <Film size={16} />
            <span>Motion</span>
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-clear"
            onClick={clearAllPlayers}
            disabled={!slots.some((s) => s.profile)}
            aria-label="Clear all players"
          >
            <Trash2 size={16} />
            <span>Clear XI</span>
          </button>
        </div>

        <button type="button" className="export-button" onClick={() => exportTimeline('video')} disabled={isExporting || isPlaying}>
          {isExporting ? <FileVideo size={17} className="is-spinning" /> : <Download size={17} />}
          {isExporting ? 'Rendering…' : 'Export video'}
        </button>
      </header>

      <main className="studio-workspace">
        <div className="stage-column">
          <Pitch
            slots={slots}
            selectedSlotId={activePanel === 'player' ? selectedSlotId : null}
            formation={formation}
            orientation={orientation}
            motion={activeMotion}
            onSelectSlot={selectSlot}
            onMoveSlot={moveSlot}
            onFreeDrag={overrideSlotRole}
            onDeselect={() => setActivePanel(null)}
          />
        </div>

        {activePanel === 'formation' && (
          <aside className="canvas-drawer formation-drawer" aria-label="Board controls">
            <FormationPanel
              formationId={formationId}
              orientation={orientation}
              isFull={isFull}
              isCustomShape={isCustomShape}
              customFormationInput={customFormationInput}
              slots={slots}
              onFormationChange={changeFormation}
              onCustomFormation={applyCustomFormation}
              onRoleOverride={overrideSlotRole}
              onOrientationChange={setOrientation}
              onAddPlayer={openPlayerSearch}
              onClose={() => setActivePanel(null)}
            />
          </aside>
        )}

        {activePanel === 'player' && (
          <aside className="canvas-drawer player-drawer" aria-label="Player controls">
            <PlayerInspector
              key={`inspector-${selectedSlot.id}`}
              slot={selectedSlot}
              onToggleVisibility={toggleVisibility}
              onRemovePlayer={removePlayer}
              onUpdatePlayer={updateSelectedPlayer}
              onOpenDirectory={() => setIsDirectoryOpen(true)}
              onClose={() => { setActivePanel(null); setIsDirectoryOpen(false); }}
            />
            {isDirectoryOpen && (
              <PlayerDirectory
                key={`directory-${selectedSlot.id}`}
                targetSlot={selectedSlot}
                onAssignPlayer={assignPlayer}
                onClose={() => setIsDirectoryOpen(false)}
              />
            )}
          </aside>
        )}

        {activePanel === 'motion' && (
          <aside className="canvas-drawer motion-drawer" aria-label="Animation and export controls">
            <MotionTimeline
              keyframes={keyframes}
              activeKeyframeId={activeKeyframeId}
              motion={motion}
              isExpanded
              isPlaying={isPlaying}
              exportState={exportState}
              onToggle={() => setActivePanel(null)}
              onSelectKeyframe={selectKeyframe}
              onAddKeyframe={addKeyframe}
              onRemoveKeyframe={removeKeyframe}
              onUpdateKeyframe={updateKeyframe}
              onMotionChange={(patch) => setMotion((current) => ({ ...current, ...patch }))}
              onPlay={runTimeline}
              onExportVideo={() => exportTimeline('video')}
              onExportGif={() => exportTimeline('gif')}
              onExportStill={exportBoard}
            />
          </aside>
        )}
      </main>

      {toast && (
        <div className="studio-toast" role="status">
          <span>{toast.message}</span>
          {toast.onUndo && <button type="button" onClick={() => { toast.onUndo(); setToast(null); }}>Undo</button>}
          <button type="button" aria-label="Dismiss message" onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}
    </div>
  );
}

export default App;
