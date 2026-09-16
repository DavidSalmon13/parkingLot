import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLotsQuery } from '../hooks/useLotsQuery';
import { useDashboardStore } from '../store/useDashboardStore';
import { LotCard } from './LotCard';
import { SearchBar } from './SearchBar';
import { AddCarModal } from './AddCarModal';
import { CarDetailPanel } from './CarDetailPanel';
import { UnassignedCarsPanel } from './UnassignedCarsPanel';
import type { Spot } from '../types';

const ZOOM_LEVELS = [1, 0.85, 0.7, 0.6, 0.5, 0.4, 0.33, 0.25];
const ZOOM_STORAGE_KEY = 'lotZoom';

function readStoredZoom(): number {
  try {
    const stored = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
    if (ZOOM_LEVELS.includes(stored)) return stored;
  } catch {
    // storage unavailable (private mode etc.) — fall back to default
  }
  return 1;
}

export function Dashboard() {
  const { isLoading, isError } = useLotsQuery();
  const lots = useDashboardStore((s) => s.lots);
  const wsConnected = useDashboardStore((s) => s.wsConnected);
  const [selected, setSelected] = useState<{ lotName: string; spot: Spot } | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [zoom, setZoom] = useState(readStoredZoom);

  useEffect(() => {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
    } catch {
      // storage unavailable — zoom just won't persist
    }
  }, [zoom]);

  const zoomIndex = ZOOM_LEVELS.indexOf(zoom);
  const zoomOut = () => setZoom(ZOOM_LEVELS[Math.min(zoomIndex + 1, ZOOM_LEVELS.length - 1)]);
  const zoomIn = () => setZoom(ZOOM_LEVELS[Math.max(zoomIndex - 1, 0)]);

  const handleSelectSpot = (lotName: string) => (spot: Spot) => {
    setSelected({ lotName, spot });
  };

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
          מנהל <span className="text-amber-400">חניון</span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <span
            className="flex items-center gap-1.5 text-xs text-zinc-400"
            title={wsConnected ? 'עדכונים חיים מחוברים' : 'מתחבר מחדש — עובר לרענון תקופתי'}
          >
            <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' : 'bg-zinc-600'}`} />
            {wsConnected ? 'פעיל' : 'מתחבר מחדש…'}
          </span>
          <SearchBar />
          <button type="button" className="link-muted whitespace-nowrap" onClick={() => setShowUnassigned(true)}>
            רכבים לא משויכים
          </button>
          <Link to="/admin" className="link-muted whitespace-nowrap">
            ניהול
          </Link>
          <span className="flex items-center gap-1 text-xs text-zinc-400" title="גודל תצוגת החניונים">
            <button
              type="button"
              className="btn-secondary px-2 py-0.5 leading-none"
              onClick={zoomOut}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              aria-label="הקטן תצוגה"
            >
              −
            </button>
            <span className="w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="btn-secondary px-2 py-0.5 leading-none"
              onClick={zoomIn}
              disabled={zoomIndex === 0}
              aria-label="הגדל תצוגה"
            >
              +
            </button>
          </span>
        </div>
      </div>

      {isLoading && <p className="text-zinc-400">טוען חניונים...</p>}
      {isError && <p className="text-rose-400">טעינת החניונים נכשלה.</p>}

      <div
        className="grid gap-4 sm:gap-6 items-start"
        style={{ zoom, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 40rem), 1fr))' }}
      >
        {lots.map((lot) => (
          <LotCard key={lot.id} lot={lot} onSelectSpot={handleSelectSpot(lot.name)} />
        ))}
      </div>

      {selected && selected.spot.status === 'available' && (
        <AddCarModal spot={selected.spot} onClose={() => setSelected(null)} />
      )}
      {selected && selected.spot.status === 'occupied' && (
        <CarDetailPanel lotName={selected.lotName} spot={selected.spot} onClose={() => setSelected(null)} />
      )}
      {showUnassigned && <UnassignedCarsPanel onClose={() => setShowUnassigned(false)} />}
    </div>
  );
}
