import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useCreateLot } from '../hooks/useMutations';

interface NewLotModalProps {
  onClose: () => void;
}

const ERROR_COPY: Record<string, string> = {
  LOT_NAME_TAKEN: 'כבר קיים חניון בשם הזה.',
};

export function NewLotModal({ onClose }: NewLotModalProps) {
  const [name, setName] = useState('');
  const createLot = useCreateLot();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createLot.mutate(
      { name, grid: { rows: [{ label: 'A', count: 1 }] } },
      { onSuccess: onClose },
    );
  };

  const error = createLot.error;
  const errorMessage =
    error instanceof ApiError ? ERROR_COPY[error.error] ?? error.message : error ? 'משהו השתבש.' : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20" onClick={onClose}>
      <div className="surface-modal p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-zinc-100">חניון חדש</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-zinc-300">
            שם החניון
            <input
              autoFocus
              className="input-field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </label>
          {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn-primary" disabled={createLot.isPending}>
              יצירה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
