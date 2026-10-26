import { ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import { createManualPlayer } from '../../services/playerDirectory';
import { accentFor } from '../../state/project';
import { Button, Field, IconButton } from '../../ui/controls';
import PhotoInput from './PhotoInput';

export default function CustomPlayerForm({ initialName, roleLabel, onBack, onCreate }) {
  const [draft, setDraft] = useState({ name: initialName, number: '', position: roleLabel, club: '', country: '', photo: null });
  const change = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (draft.name.trim()) onCreate(createManualPlayer(draft));
  };

  return (
    <form className="custom-player" onSubmit={submit}>
      <header className="popover-header">
        <IconButton size="sm" icon={ArrowLeft} label="Back to search" onClick={onBack} />
        <h3>Custom player</h3>
      </header>

      <div className="custom-player-body">
        <PhotoInput
          player={draft}
          accent={draft.name ? accentFor(draft.name) : undefined}
          onPhotoChange={(photo) => setDraft((current) => ({ ...current, photo }))}
        />
        <Field label="Name">
          <input value={draft.name} onChange={change('name')} placeholder="e.g. Thierry Henry" required autoFocus />
        </Field>
        <div className="field-pair">
          <Field label="Number">
            <input type="number" min="0" max="99" value={draft.number} onChange={change('number')} placeholder="14" />
          </Field>
          <Field label="Position">
            <input value={draft.position} onChange={change('position')} />
          </Field>
        </div>
        <div className="field-pair">
          <Field label="Club">
            <input value={draft.club} onChange={change('club')} placeholder="Optional" />
          </Field>
          <Field label="Country">
            <input value={draft.country} onChange={change('country')} placeholder="Optional" />
          </Field>
        </div>
      </div>

      <footer className="popover-footer">
        <Button type="submit" variant="primary" icon={Check} className="btn-block" disabled={!draft.name.trim()}>
          Add to lineup
        </Button>
      </footer>
    </form>
  );
}
