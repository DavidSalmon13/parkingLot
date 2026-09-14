import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCarDetail } from '../api/cars';
import { useRemoveCar } from '../hooks/useMutations';
import type { Spot } from '../types';

interface CarDetailPanelProps {
  lotName: string;
  spot: Spot;
  onClose: () => void;
}

export function CarDetailPanel({ lotName, spot, onClose }: CarDetailPanelProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const carId = spot.car?.id;

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => fetchCarDetail(carId!),
    enabled: !!carId,
  });

  const removeCar = useRemoveCar();

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-full max-w-sm transition-all duration-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-gray-500">
          {lotName} / {spot.label}
        </div>

        {isLoading && <p className="mt-4 text-sm text-gray-500">Loading...</p>}

        {car && (
          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-xl font-semibold">{car.id}</h3>
            <p>{car.ownerName}</p>
            <p className="text-sm text-gray-600">Employee ID: {car.employeeId}</p>
            {car.phoneNumber && <p className="text-sm text-gray-600">Phone: {car.phoneNumber}</p>}
            {car.notes && <p className="text-sm text-gray-600">Notes: {car.notes}</p>}
            {car.currentLocation && (
              <p className="text-xs text-gray-400">
                Parked since {new Date(car.currentLocation.assignedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {!confirmingRemove ? (
            <>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-gray-300"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
                onClick={() => setConfirmingRemove(true)}
              >
                Remove car
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-600 mr-auto self-center">Are you sure?</span>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-gray-300"
                onClick={() => setConfirmingRemove(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white disabled:opacity-50"
                disabled={removeCar.isPending}
                onClick={() => removeCar.mutate(spot.id, { onSuccess: onClose })}
              >
                Confirm remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
