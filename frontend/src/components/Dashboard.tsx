import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLotsQuery } from '../hooks/useLotsQuery';
import { useDashboardStore } from '../store/useDashboardStore';
import { LotCard } from './LotCard';
import { SearchBar } from './SearchBar';
import { AddCarModal } from './AddCarModal';
import { CarDetailPanel } from './CarDetailPanel';
import type { Spot } from '../types';

export function Dashboard() {
  const { isLoading, isError } = useLotsQuery();
  const lots = useDashboardStore((s) => s.lots);
  const wsConnected = useDashboardStore((s) => s.wsConnected);
  const [selected, setSelected] = useState<{ lotName: string; spot: Spot } | null>(null);

  const handleSelectSpot = (lotName: string) => (spot: Spot) => {
    setSelected({ lotName, spot });
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parking Lot Manager</h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-500" title={wsConnected ? 'Live updates connected' : 'Reconnecting — falling back to periodic refresh'}>
            <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            {wsConnected ? 'Live' : 'Reconnecting…'}
          </span>
          <SearchBar />
          <Link to="/admin" className="text-sm text-gray-600 underline whitespace-nowrap">
            Admin
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading lots...</p>}
      {isError && <p className="text-red-600">Failed to load lots.</p>}

      <div className="flex flex-col gap-6">
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
    </div>
  );
}
