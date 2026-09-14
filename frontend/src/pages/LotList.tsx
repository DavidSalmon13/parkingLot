import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { GridInput } from '../components/GridInput';
import { useLotsQuery } from '../hooks/useLotsQuery';
import { useCreateLot, useDeleteLot, useRenameLot } from '../hooks/useMutations';
import { useDashboardStore } from '../store/useDashboardStore';
import type { GridPayload } from '../types';

const CREATE_ERROR_COPY: Record<string, string> = {
  LOT_NAME_TAKEN: 'A lot with that name already exists.',
};

export function LotList() {
  const { isLoading } = useLotsQuery();
  const lots = useDashboardStore((s) => s.lots);
  const navigate = useNavigate();

  const [newName, setNewName] = useState('');
  const [newGrid, setNewGrid] = useState<GridPayload | null>(null);
  const createLot = useCreateLot();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameLot = useRenameLot();

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const deleteLot = useDeleteLot();

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createLot.mutate(
      { name: newName, grid: newGrid ?? undefined },
      {
        onSuccess: (lot) => {
          setNewName('');
          setNewGrid(null);
          navigate(`/admin/lots/${lot.id}`);
        },
      },
    );
  };

  const createError = createLot.error;
  const createErrorMessage =
    createError instanceof ApiError ? CREATE_ERROR_COPY[createError.error] ?? createError.message : null;

  const startRename = (lotId: string, currentName: string) => {
    setRenamingId(lotId);
    setRenameValue(currentName);
    renameLot.reset();
  };

  const commitRename = (lotId: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    renameLot.mutate(
      { lotId, payload: { name: renameValue } },
      { onSuccess: () => setRenamingId(null) },
    );
  };

  const renameError = renameLot.error;
  const renameErrorMessage =
    renameError instanceof ApiError ? CREATE_ERROR_COPY[renameError.error] ?? renameError.message : null;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Lots</h2>
        {isLoading && <p className="text-gray-500">Loading lots...</p>}
        <div className="flex flex-col gap-2">
          {lots.map((lot) => {
            const occupied = lot.spots.filter((s) => s.status === 'occupied').length;
            const deleteError = confirmingDeleteId === lot.id ? deleteLot.error : null;
            const deleteErrorMessage =
              deleteError instanceof ApiError
                ? deleteError.error === 'LOT_HAS_OCCUPIED_SPOTS'
                  ? `Occupied spots block deletion: ${(deleteError.details?.occupiedSpotLabels as string[] | undefined)?.join(', ')}`
                  : deleteError.message
                : null;

            return (
              <div key={lot.id} className="border rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  {renamingId === lot.id ? (
                    <input
                      autoFocus
                      className="border rounded px-2 py-1 text-sm flex-1"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(lot.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(lot.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                  ) : (
                    <Link to={`/admin/lots/${lot.id}`} className="font-semibold hover:underline">
                      {lot.name}
                    </Link>
                  )}
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {occupied}/{lot.spots.length} occupied
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded border border-gray-300"
                      onClick={() => startRename(lot.id, lot.name)}
                    >
                      Rename
                    </button>
                    {confirmingDeleteId === lot.id ? (
                      <>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded border border-gray-300"
                          onClick={() => setConfirmingDeleteId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-50"
                          disabled={deleteLot.isPending}
                          onClick={() => deleteLot.mutate(lot.id, { onSuccess: () => setConfirmingDeleteId(null) })}
                        >
                          Confirm delete
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded border border-red-300 text-red-600"
                        onClick={() => {
                          setConfirmingDeleteId(lot.id);
                          deleteLot.reset();
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {renamingId === lot.id && renameErrorMessage && (
                  <p className="text-sm text-red-600">{renameErrorMessage}</p>
                )}
                {deleteErrorMessage && <p className="text-sm text-red-600">{deleteErrorMessage}</p>}
              </div>
            );
          })}
          {!isLoading && lots.length === 0 && <p className="text-sm text-gray-500">No lots yet.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3 max-w-sm">
        <h2 className="text-xl font-semibold">New Lot</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <label className="text-sm">
            Lot name
            <input
              className="mt-1 w-full border rounded px-2 py-1.5"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </label>
          <p className="text-xs text-gray-500">Optionally generate a spot grid now — you can also add spots later.</p>
          <GridInput onChange={setNewGrid} />
          {createErrorMessage && <p className="text-sm text-red-600">{createErrorMessage}</p>}
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50 self-start"
            disabled={createLot.isPending}
          >
            Create lot
          </button>
        </form>
      </section>
    </div>
  );
}
