import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { useAddRow, useRemoveLastRow } from '../hooks/useMutations';
import type { Lot } from '../types';

interface LotRowControlsProps {
  lot: Lot;
}

// Mirrors the backend's pick: the alphabetically last row label is the one
// "+" would have added next, so it's the one "-" undoes.
function getLastRow(spots: Lot['spots']): string | null {
  if (spots.length === 0) return null;
  return spots.reduce((max, s) => (s.row > max ? s.row : max), spots[0].row);
}

export function LotRowControls({ lot }: LotRowControlsProps) {
  const addRow = useAddRow();
  const removeLastRow = useRemoveLastRow();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timeout);
  }, [error]);

  const handleError = (e: unknown) => setError(e instanceof ApiError ? e.message : 'משהו השתבש.');

  const lastRow = getLastRow(lot.spots);
  const canRemove = lastRow !== null && !lot.spots.some((s) => s.row === lastRow && s.status === 'occupied');

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        className="btn-secondary w-6 h-6 flex items-center justify-center text-sm leading-none p-0"
        onClick={() => {
          setError(null);
          addRow.mutate(lot.id, { onError: handleError });
        }}
        disabled={addRow.isPending}
        title="הוספת שורה חדשה"
        aria-label="הוספת שורה חדשה"
      >
        +
      </button>
      <button
        type="button"
        className="btn-secondary w-6 h-6 flex items-center justify-center text-sm leading-none p-0"
        onClick={() => {
          setError(null);
          removeLastRow.mutate(lot.id, { onError: handleError });
        }}
        disabled={removeLastRow.isPending || !canRemove}
        title="הסרת השורה האחרונה (רק אם היא ריקה)"
        aria-label="הסרת השורה האחרונה"
      >
        −
      </button>
      {error && (
        <span className="absolute top-full mt-1 right-0 w-max max-w-[12rem] text-[10px] text-rose-400 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 z-10 text-center">
          {error}
        </span>
      )}
    </div>
  );
}
