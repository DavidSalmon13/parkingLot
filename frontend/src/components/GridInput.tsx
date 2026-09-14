import { useMemo, useState } from 'react';
import type { GridPayload, GridRowSpec } from '../types';

interface GridInputProps {
  onChange: (grid: GridPayload | null) => void;
  // Row labels the lot already has, e.g. from LotEditor's "Generate spots"
  // form. Omitted/empty for a brand-new lot, which has no rows to extend yet.
  existingRowLabels?: string[];
}

function nextLetter(usedLabels: string[]): string {
  const used = new Set(usedLabels.map((l) => l.toUpperCase()));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return '';
}

export function GridInput({ onChange, existingRowLabels = [] }: GridInputProps) {
  const [rows, setRows] = useState<GridRowSpec[]>([]);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [countText, setCountText] = useState('10');
  const [selectedExistingRow, setSelectedExistingRow] = useState(existingRowLabels[0] ?? '');

  // The next auto-label accounts for rows already staged in this form too,
  // so adding two new rows in a row doesn't suggest the same letter twice.
  const suggestedLabel = useMemo(
    () => nextLetter([...existingRowLabels, ...rows.map((r) => r.label)]),
    [existingRowLabels, rows],
  );

  const emit = (next: GridRowSpec[]) => {
    setRows(next);
    onChange(next.length > 0 ? { rows: next } : null);
  };

  const addRow = () => {
    const count = Number(countText);
    if (!Number.isInteger(count) || count < 1 || count > 200) return;
    const label = mode === 'existing' ? selectedExistingRow : suggestedLabel;
    if (!label) return;
    emit([...rows, { label, count }]);
  };

  const removeRow = (index: number) => {
    emit(rows.filter((_, i) => i !== index));
  };

  const canAddToExisting = existingRowLabels.length > 0;
  const showingExistingRowMode = mode === 'existing' && canAddToExisting;

  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <ul className="flex flex-col gap-1">
          {rows.map((row, i) => (
            <li
              key={`${row.label}-${i}`}
              className="flex items-center justify-between text-sm bg-gray-50 border rounded px-2 py-1"
            >
              <span>
                {existingRowLabels.includes(row.label) ? 'Add to row' : 'New row'} {row.label} — +{row.count} spots
              </span>
              <button type="button" onClick={() => removeRow(i)} className="text-red-600 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAddToExisting && (
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
            New row
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} />
            Add to existing row
          </label>
        </div>
      )}

      <div className="flex items-end gap-2">
        {showingExistingRowMode ? (
          <label className="text-sm flex-1">
            Row
            <select
              className="mt-1 w-full border rounded px-2 py-1.5"
              value={selectedExistingRow}
              onChange={(e) => setSelectedExistingRow(e.target.value)}
            >
              {existingRowLabels.map((rowLabel) => (
                <option key={rowLabel} value={rowLabel}>
                  {rowLabel}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="text-sm flex-1">
            Row
            <div className="mt-1 border rounded px-2 py-1.5 bg-gray-50 text-gray-700">{suggestedLabel || '—'}</div>
          </div>
        )}
        <label className="text-sm flex-1">
          Number of spots
          <input
            type="number"
            min={1}
            max={200}
            className="mt-1 w-full border rounded px-2 py-1.5"
            value={countText}
            onChange={(e) => setCountText(e.target.value)}
            placeholder="10"
          />
        </label>
        <button
          type="button"
          onClick={addRow}
          className="border rounded px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
