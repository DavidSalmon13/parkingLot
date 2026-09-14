import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { GridInput } from '../components/GridInput';
import { useLotsQuery } from '../hooks/useLotsQuery';
import { useAddSpot, useDeleteSpot, useGenerateSpots, useRenameLot, useUpdateSpot } from '../hooks/useMutations';
import { useDashboardStore } from '../store/useDashboardStore';
import type { GridPayload, Spot } from '../types';

const LOT_ERROR_COPY: Record<string, string> = {
  LOT_NAME_TAKEN: 'A lot with that name already exists.',
};

const SPOT_ERROR_COPY: Record<string, string> = {
  SPOT_LABEL_TAKEN: 'That label is already used in this lot.',
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

  if (isLoading && !lot) return <p className="text-gray-500">Loading lot...</p>;

  if (!lot) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-red-600">Lot not found.</p>
        <Link to="/admin" className="text-sm underline">
          ← Back to lots
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
        ? `Spot occupied by ${deleteError.details?.carId} — remove the car first.`
        : deleteError.message
      : null;

  const sortedSpots = [...lot.spots].sort((a, b) => a.row.localeCompare(b.row) || a.position - b.position);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link to="/admin" className="text-sm text-gray-600 underline self-start">
          ← Back to lots
        </Link>
        {renaming ? (
          <input
            autoFocus
            className="border rounded px-2 py-1 text-2xl font-bold"
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
            className="text-2xl font-bold cursor-pointer"
            onClick={() => {
              setRenaming(true);
              setRenameValue(lot.name);
            }}
            title="Click to rename"
          >
            {lot.name}
          </h2>
        )}
        {renameErrorMessage && <p className="text-sm text-red-600">{renameErrorMessage}</p>}
      </div>

      <section className="flex flex-col gap-3 max-w-sm">
        <h3 className="text-lg font-semibold">Generate spots</h3>
        <form onSubmit={handleGenerate} className="flex flex-col gap-3">
          <GridInput onChange={setGrid} existingRowLabels={[...new Set(lot.spots.map((s) => s.row))].sort()} />
          {generateErrorMessage && <p className="text-sm text-red-600">{generateErrorMessage}</p>}
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50 self-start"
            disabled={!grid || generateSpots.isPending}
          >
            Generate
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3 max-w-md">
        <h3 className="text-lg font-semibold">Add custom spot</h3>
        <form onSubmit={handleAddSpot} className="flex gap-2 items-end flex-wrap">
          <label className="text-sm">
            Label
            <input
              className="mt-1 border rounded px-2 py-1.5 w-24"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            Row
            <input
              className="mt-1 border rounded px-2 py-1.5 w-20"
              value={newRow}
              onChange={(e) => setNewRow(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            Position
            <input
              type="number"
              className="mt-1 border rounded px-2 py-1.5 w-20"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
            disabled={addSpot.isPending}
          >
            Add spot
          </button>
        </form>
        {addSpotErrorMessage && <p className="text-sm text-red-600">{addSpotErrorMessage}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Spots</h3>
        <table className="text-sm border-collapse">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pr-4 pb-2">Label</th>
              <th className="pr-4 pb-2">Row</th>
              <th className="pr-4 pb-2">Position</th>
              <th className="pr-4 pb-2">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSpots.map((spot) => (
              <tr key={spot.id} className="border-t align-top">
                {editingSpotId === spot.id ? (
                  <>
                    <td className="pr-4 py-1">
                      <input
                        className="border rounded px-1 py-0.5 w-20"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                      />
                    </td>
                    <td className="pr-4 py-1">
                      <input
                        className="border rounded px-1 py-0.5 w-16"
                        value={editRow}
                        onChange={(e) => setEditRow(e.target.value)}
                      />
                    </td>
                    <td className="pr-4 py-1">
                      <input
                        type="number"
                        className="border rounded px-1 py-0.5 w-16"
                        value={editPosition}
                        onChange={(e) => setEditPosition(e.target.value)}
                      />
                    </td>
                    <td className="pr-4 py-1 text-gray-500">{spot.status}</td>
                    <td className="py-1">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border border-gray-300"
                          onClick={() => setEditingSpotId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded bg-gray-900 text-white disabled:opacity-50"
                          disabled={updateSpot.isPending}
                          onClick={() => commitEdit(spot.id)}
                        >
                          Save
                        </button>
                      </div>
                      {editErrorMessage && <p className="text-xs text-red-600 mt-1">{editErrorMessage}</p>}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="pr-4 py-1 font-medium">{spot.label}</td>
                    <td className="pr-4 py-1">{spot.row}</td>
                    <td className="pr-4 py-1">{spot.position}</td>
                    <td className="pr-4 py-1">
                      <span className={spot.status === 'occupied' ? 'text-red-600' : 'text-green-600'}>
                        {spot.status}
                      </span>
                      {spot.car && <span className="text-gray-500"> ({spot.car.id})</span>}
                    </td>
                    <td className="py-1">
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border border-gray-300"
                          onClick={() => startEdit(spot)}
                        >
                          Edit
                        </button>
                        {confirmingDeleteSpotId === spot.id ? (
                          <>
                            <button
                              type="button"
                              className="px-2 py-1 text-xs rounded border border-gray-300"
                              onClick={() => setConfirmingDeleteSpotId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-50"
                              disabled={deleteSpot.isPending}
                              onClick={() =>
                                deleteSpot.mutate(spot.id, { onSuccess: () => setConfirmingDeleteSpotId(null) })
                              }
                            >
                              Confirm
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="px-2 py-1 text-xs rounded border border-red-300 text-red-600"
                            onClick={() => {
                              setConfirmingDeleteSpotId(spot.id);
                              deleteSpot.reset();
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      {confirmingDeleteSpotId === spot.id && deleteErrorMessage && (
                        <p className="text-xs text-red-600 mt-1">{deleteErrorMessage}</p>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedSpots.length === 0 && <p className="text-sm text-gray-500">No spots yet.</p>}
      </section>
    </div>
  );
}
