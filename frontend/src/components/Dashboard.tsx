import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLotsQuery } from '../hooks/useLotsQuery';
import { useDashboardStore } from '../store/useDashboardStore';
import { LotCard } from './LotCard';
import { SearchBar } from './SearchBar';
import { AddCarModal } from './AddCarModal';
import { CarDetailPanel } from './CarDetailPanel';
import { UnassignedCarsPanel } from './UnassignedCarsPanel';
import type { Spot } from '../types';

export function Dashboard() {
  const { isLoading, isError } = useLotsQuery();
  const lots = useDashboardStore((s) => s.lots);
  const wsConnected = useDashboardStore((s) => s.wsConnected);
  const [selected, setSelected] = useState<{ lotName: string; spot: Spot } | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

  const handleSelectSpot = (lotName: string) => (spot: Spot) => {
    setSelected({ lotName, spot });
  };

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
          מנהל <span className="text-amber-400">חניון</span>
        </h1>
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      {isLoading && <p className="text-zinc-400">טוען חניונים...</p>}
      {isError && <p className="text-rose-400">טעינת החניונים נכשלה.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
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
