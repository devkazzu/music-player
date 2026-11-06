import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';

interface PlaylistDialogProps {
  open: boolean;
  mode?: 'create' | 'rename';
  initialName?: string;
  initialDescription?: string;
  onClose: () => void;
  onSubmit: (values: { name: string; description: string }) => Promise<void> | void;
}

export function PlaylistDialog({
  open,
  mode = 'create',
  initialName = '',
  initialDescription = '',
  onClose,
  onSubmit,
}: PlaylistDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
      setBusy(false);
    }
  }, [open, initialName, initialDescription]);

  const trimmed = name.trim();

  const submit = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, description: description.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New playlist' : 'Edit playlist'}
      description={
        mode === 'create'
          ? 'Give your next cinematic moment a name. You can add tracks afterwards.'
          : 'Rename the playlist or rewrite its description.'
      }
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-glass" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void submit()}
            disabled={!trimmed || busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {mode === 'create' ? 'Create playlist' : 'Save changes'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4 pb-1"
      >
        <label className="block">
          <span className="eyebrow mb-2 block">Name</span>
          <input
            className="field"
            value={name}
            maxLength={80}
            placeholder="e.g. Tokyo Rooftop, 3 a.m."
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block">Description</span>
          <textarea
            className="field min-h-20 resize-y"
            value={description}
            maxLength={220}
            placeholder="What is this playlist for?"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
