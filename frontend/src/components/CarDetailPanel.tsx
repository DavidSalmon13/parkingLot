import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCarDetail } from '../api/cars';
import { useRemoveCar, useUpdateCar } from '../hooks/useMutations';
import { ApiError } from '../api/client';
import type { Spot } from '../types';

interface CarDetailPanelProps {
  lotName: string;
  spot: Spot;
  onClose: () => void;
}

export function CarDetailPanel({ lotName, spot, onClose }: CarDetailPanelProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [editing, setEditing] = useState(false);
  const [licensePlateNumber, setLicensePlateNumber] = useState('');
  const [carType, setCarType] = useState('');
  const [clientName, setClientName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const carId = spot.car?.chassisNumber;

  const { data: car, isLoading } = useQuery({
    queryKey: ['car', carId],
    queryFn: () => fetchCarDetail(carId!),
    enabled: !!carId,
  });

  const removeCar = useRemoveCar();
  const updateCar = useUpdateCar();

  const startEditing = () => {
    if (!car) return;
    updateCar.reset();
    setLicensePlateNumber(car.licensePlateNumber);
    setCarType(car.carType);
    setClientName(car.clientName);
    setDeliveryDate(car.deliveryDate ?? '');
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!carId) return;
    updateCar.mutate(
      { carId, payload: { licensePlateNumber, carType, clientName, deliveryDate: deliveryDate || undefined } },
      { onSuccess: () => setEditing(false) },
    );
  };

  const updateError = updateCar.error;
  const updateErrorMessage =
    updateError instanceof ApiError ? updateError.message : updateError ? 'Something went wrong.' : null;

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

        {car && !editing && (
          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-xl font-semibold">{car.chassisNumber}</h3>
            <p>{car.clientName}</p>
            <p className="text-sm text-gray-600">License plate: {car.licensePlateNumber}</p>
            <p className="text-sm text-gray-600">Car type: {car.carType}</p>
            {car.deliveryDate && <p className="text-sm text-gray-600">Delivery date: {car.deliveryDate}</p>}
            {car.currentLocation && (
              <p className="text-xs text-gray-400">
                Parked since {new Date(car.currentLocation.assignedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {car && editing && (
          <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
            <label className="text-sm">
              License plate number
              <input
                className="mt-1 w-full border rounded px-2 py-1.5"
                value={licensePlateNumber}
                onChange={(e) => setLicensePlateNumber(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Car type
              <input
                className="mt-1 w-full border rounded px-2 py-1.5"
                value={carType}
                onChange={(e) => setCarType(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Client name
              <input
                className="mt-1 w-full border rounded px-2 py-1.5"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Delivery date (optional)
              <input
                type="date"
                className="mt-1 w-full border rounded px-2 py-1.5"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </label>

            {updateErrorMessage && <p className="text-sm text-red-600">{updateErrorMessage}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-gray-300"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
                disabled={updateCar.isPending}
              >
                Save
              </button>
            </div>
          </form>
        )}

        {car && !editing && !confirmingRemove && (
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300" onClick={onClose}>
              Close
            </button>
            <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300" onClick={startEditing}>
              Edit
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
              onClick={() => setConfirmingRemove(true)}
            >
              Remove car
            </button>
          </div>
        )}

        {confirmingRemove && (
          <div className="mt-6 flex justify-end gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
}
