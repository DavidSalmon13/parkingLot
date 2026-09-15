import { useState, type FormEvent } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';

export function SearchBar() {
  const [term, setTerm] = useState('');
  const [notFound, setNotFound] = useState(false);
  const lots = useDashboardStore((s) => s.lots);
  const setHighlightedSpotId = useDashboardStore((s) => s.setHighlightedSpotId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const match = lots.flatMap((lot) => lot.spots).find((spot) => spot.car?.chassisNumber === term.trim());

    if (match) {
      setNotFound(false);
      setHighlightedSpotId(match.id);
      document.getElementById(`spot-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setNotFound(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        className="border rounded px-2 py-1.5 text-sm"
        placeholder="Find car by chassis number..."
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setNotFound(false);
        }}
        maxLength={50}
      />
      <button type="submit" className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white">
        Find
      </button>
      {notFound && <span className="text-sm text-red-600">No car found with that chassis number.</span>}
    </form>
  );
}
