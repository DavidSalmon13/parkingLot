import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { GridInput } from '../components/GridInput';
import { useLotsQuery } from '../hooks/useLotsQuery';
import { useAddSpot, useDeleteSpot, useGenerateSpots, useRenameLot, useUpdateSpot } from '../hooks/useMutations';
import { useDashboardStore } from '../store/useDashboardStore';
import type { GridPayload, Spot } from '../types';

const LOT_ERROR_COPY: Record<string, string> = {
  LOT_NAME_TAKEN: 'כבר קיים חניון בשם הזה.',
};

const SPOT_ERROR_COPY: Record<string, string> = {
  SPOT_LABEL_TAKEN: 'התווית הזו כבר בשימוש בחניון הזה.',
};

const STATUS_LABELS: Record<string, string> = {
  occupied: 'תפוס',
  available: 'פנוי',
};

export function LotEditor() {
  const { id } = useParams<{ id: string }>();
  const { isLoading } = useLotsQuery();
  const lot = useDashboardStore((s) => s.lots.find((l) => l.id === id));

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameLot = useRenameLot();

  const [grid, setGrid] = useState<GridPayload | null>(null);
  const generateSpots = useGenerateSpots();

  const [newLabel, setNewLabel] = useState('');
  const [newRow, setNewRow] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const addSpot = useAddSpot();

  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editRow, setEditRow] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const updateSpot = useUpdateSpot();

  const [confirmingDeleteSpotId, setConfirmingDeleteSpotId] = useState<string | null>(null);
  const deleteSpot = useDeleteSpot();

  if (isLoading && !lot) return <p className="text-zinc-400">טוען חניון...</p>;

  if (!lot) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-rose-400">החניון לא נמצא.</p>
        <Link to="/admin" className="text-sm text-zinc-300 underline">
          ← חזרה לחניונים
        </Link>
      </div>
    );
  }

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    if (!grid) return;
    generateSpots.mutate({ lotId: lot.id, payload: grid });
  };

  const handleAddSpot = (e: FormEvent) => {
    e.preventDefault();
    addSpot.mutate(
      { lotId: lot.id, payload: { label: newLabel, row: newRow, position: Number(newPosition) } },
      {
        onSuccess: () => {
          setNewLabel('');
          setNewRow('');
          setNewPosition('');
        },
      },
    );
  };

  const startEdit = (spot: Spot) => {
    setEditingSpotId(spot.id);
    setEditLabel(spot.label);
    setEditRow(spot.row);
    setEditPosition(String(spot.position));
    updateSpot.reset();
  };

  const commitEdit = (spotId: string) => {
    updateSpot.mutate(
      { spotId, payload: { label: editLabel, row: editRow, position: Number(editPosition) } },
      { onSuccess: () => setEditingSpotId(null) },
    );
  };

  const renameError = renameLot.error;
  const renameErrorMessage =
    renameError instanceof ApiError ? LOT_ERROR_COPY[renameError.error] ?? renameError.message : null;

  const generateError = generateSpots.error;
  const generateErrorMessage = generateError instanceof ApiError ? generateError.message : null;

  const addSpotError = addSpot.error;
  const addSpotErrorMessage =
    addSpotError instanceof ApiError ? SPOT_ERROR_COPY[addSpotError.error] ?? addSpotError.message : null;

  const editError = updateSpot.error;
  const editErrorMessage = editError instanceof ApiError ? SPOT_ERROR_COPY[editError.error] ?? editError.message : null;

  const deleteError = deleteSpot.error;
  const deleteErrorMessage =
    deleteError instanceof ApiError
      ? deleteError.error === 'SPOT_OCCUPIED'
        ? `המקום תפוס על ידי ${deleteError.details?.carId} — יש להסיר את הרכב קודם.`
        : deleteError.message
      : null;

  const sortedSpots = [...lot.spots].sort((a, b) => a.row.localeCompare(b.row) || a.position - b.position);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link to="/admin" className="link-muted self-start">
          ← חזרה לחניונים
        </Link>
        {renaming ? (
          <input
            autoFocus
            className="input-field text-2xl font-bold w-auto"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => {
              if (renameValue.trim() && renameValue !== lot.name) {
                renameLot.mutate(
                  { lotId: lot.id, payload: { name: renameValue } },
                  { onSuccess: () => setRenaming(false) },
                );
              } else {
                setRenaming(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <h2
            className="text-2xl font-bold cursor-pointer text-zinc-100 tracking-tight"
            onClick={() => {
              setRenaming(true);
              setRenameValue(lot.name);
            }}
            title="לחצו לשינוי שם"
          >
            {lot.name}
          </h2>
        )}
        {renameErrorMessage && <p className="text-sm text-rose-400">{renameErrorMessage}</p>}
      </div>

      <section className="flex flex-col gap-3 max-w-sm">
        <h3 className="text-lg font-semibold text-zinc-100">יצירת מקומות חניה</h3>
        <form onSubmit={handleGenerate} className="flex flex-col gap-3">
          <GridInput onChange={setGrid} existingRowLabels={[...new Set(lot.spots.map((s) => s.row))].sort()} />
          {generateErrorMessage && <p className="text-sm text-rose-400">{generateErrorMessage}</p>}
          <button type="submit" className="btn-primary self-start" disabled={!grid || generateSpots.isPending}>
            יצירה
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 max-w-md">
        <h3 className="text-lg font-semibold text-zinc-100">הוספת מקום מותאם אישית</h3>
        <form onSubmit={handleAddSpot} className="flex gap-2 items-end flex-wrap">
          <label className="text-sm text-zinc-300">
            תווית
            <input
              className="input-field mt-1 w-24"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
            />
          </label>
          <label className="text-sm text-zinc-300">
            שורה
            <input
              className="input-field mt-1 w-20"
              value={newRow}
              onChange={(e) => setNewRow(e.target.value)}
              required
            />
          </label>
          <label className="text-sm text-zinc-300">
            מיקום
            <input
              type="number"
              className="input-field mt-1 w-20"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={addSpot.isPending}>
            הוספת מקום
          </button>
        </form>
        {addSpotErrorMessage && <p className="text-sm text-rose-400">{addSpotErrorMessage}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-zinc-100">מקומות חניה</h3>
        <table className="text-sm border-collapse">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="pr-4 pb-2">תווית</th>
              <th className="pr-4 pb-2">שורה</th>
              <th className="pr-4 pb-2">מיקום</th>
              <th className="pr-4 pb-2">סטטוס</th>
              <th className="pb-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {sortedSpots.map((spot) => (
              <tr key={spot.id} className="border-t border-zinc-800 align-top text-zinc-200">
                {editingSpotId === spot.id ? (
                  <>
                    <td className="pr-4 py-1">
                      <input
                        className="input-field py-0.5 w-20"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                      />
                    </td>
                    <td className="pr-4 py-1">
                      <input
                        className="input-field py-0.5 w-16"
                        value={editRow}
                        onChange={(e) => setEditRow(e.target.value)}
                      />
                    </td>
                    <td className="pr-4 py-1">
                      <input
                        type="number"
                        className="input-field py-0.5 w-16"
                        value={editPosition}
                        onChange={(e) => setEditPosition(e.target.value)}
                      />
                    </td>
                    <td className="pr-4 py-1 text-zinc-500">{STATUS_LABELS[spot.status]}</td>
                    <td className="py-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs px-2 py-1"
                          onClick={() => setEditingSpotId(null)}
                        >
                          ביטול
                        </button>
                        <button
                          type="button"
                          className="btn-primary text-xs px-2 py-1"
                          disabled={updateSpot.isPending}
                          onClick={() => commitEdit(spot.id)}
                        >
                          שמירה
                        </button>
                      </div>
                      {editErrorMessage && <p className="text-xs text-rose-400 mt-1">{editErrorMessage}</p>}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="pr-4 py-1 font-medium">{spot.label}</td>
                    <td className="pr-4 py-1">{spot.row}</td>
                    <td className="pr-4 py-1">{spot.position}</td>
                    <td className="pr-4 py-1">
                      <span className={spot.status === 'occupied' ? 'text-rose-400' : 'text-emerald-400'}>
                        {STATUS_LABELS[spot.status]}
                      </span>
                      {spot.car && <span className="text-zinc-500"> ({spot.car.chassisNumber})</span>}
                    </td>
                    <td className="py-1">
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          className="btn-secondary text-xs px-2 py-1"
                          onClick={() => startEdit(spot)}
                        >
                          עריכה
                        </button>
                        {confirmingDeleteSpotId === spot.id ? (
                          <>
                            <button
                              type="button"
                              className="btn-secondary text-xs px-2 py-1"
                              onClick={() => setConfirmingDeleteSpotId(null)}
                            >
                              ביטול
                            </button>
                            <button
                              type="button"
                              className="btn-danger text-xs px-2 py-1"
                              disabled={deleteSpot.isPending}
                              onClick={() =>
                                deleteSpot.mutate(spot.id, { onSuccess: () => setConfirmingDeleteSpotId(null) })
                              }
                            >
                              אישור
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-danger-outline text-xs px-2 py-1"
                            onClick={() => {
                              setConfirmingDeleteSpotId(spot.id);
                              deleteSpot.reset();
                            }}
                          >
                            מחיקה
                          </button>
                        )}
                      </div>
                      {confirmingDeleteSpotId === spot.id && deleteErrorMessage && (
                        <p className="text-xs text-rose-400 mt-1">{deleteErrorMessage}</p>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedSpots.length === 0 && <p className="text-sm text-zinc-500">אין עדיין מקומות חניה.</p>}
      </section>
    </div>
  );
}
