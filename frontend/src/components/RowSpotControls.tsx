import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { useAddSpotToRow, useRemoveSpotFromRow } from '../hooks/useMutations';

interface RowSpotControlsProps {
  lotId: string;
  row: string;
  // Whether the row currently has at least one available spot to remove —
  // the server has the final say, but disabling client-side avoids a
  // guaranteed-to-fail round trip when the row is visibly full.
  canRemove: boolean;
}

export function RowSpotControls({ lotId, row, canRemove }: RowSpotControlsProps) {
  const addSpotToRow = useAddSpotToRow();
  const removeSpotFromRow = useRemoveSpotFromRow();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timeout);
  }, [error]);

  const handleError = (e: unknown) => setError(e instanceof ApiError ? e.message : 'משהו השתבש.');

  return (
    <div className="relative flex flex-col items-center gap-1 shrink-0 self-center">
      <button
        type="button"
        className="btn-secondary w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-sm leading-none p-0"
        onClick={() => {
          setError(null);
          addSpotToRow.mutate({ lotId, row }, { onError: handleError });
        }}
        disabled={addSpotToRow.isPending}
        title={`הוספת מקום לסוף שורה ${row}`}
        aria-label={`הוספת מקום לסוף שורה ${row}`}
      >
        +
      </button>
      <button
        type="button"
        className="btn-secondary w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-sm leading-none p-0"
        onClick={() => {
          setError(null);
          removeSpotFromRow.mutate({ lotId, row }, { onError: handleError });
        }}
        disabled={removeSpotFromRow.isPending || !canRemove}
        title={`הסרת המקום הפנוי האחרון בשורה ${row}`}
        aria-label={`הסרת המקום הפנוי האחרון בשורה ${row}`}
      >
        −
      </button>
      {error && (
        <span className="absolute top-full mt-1 w-max max-w-[10rem] text-[10px] text-rose-400 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 z-10 text-center">
          {error}
        </span>
      )}
    </div>
  );
}
