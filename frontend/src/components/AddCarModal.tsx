import { useState } from 'react';
import { ApiError } from '../api/client';
import { useAssignCar } from '../hooks/useMutations';
import { CarFieldsInputs } from './CarFieldsInputs';
import type { Spot } from '../types';

interface AddCarModalProps {
  spot: Spot;
  onClose: () => void;
}

type Tab = 'existing' | 'new';

const ERROR_COPY: Record<string, string> = {
  CAR_NOT_FOUND: "No car with that chassis number — switch to 'New car' to register it.",
  CAR_ID_EXISTS: 'This chassis number is already registered — switch to \'Existing car\'.',
  SPOT_OCCUPIED: 'This spot was just taken by someone else.',
  SPOT_NOT_FOUND: 'This spot no longer exists — it was removed by someone else. Refreshing...',
};

export function AddCarModal({ spot, onClose }: AddCarModalProps) {
  const [tab, setTab] = useState<Tab>('existing');
  const [carId, setCarId] = useState('');
  const [licensePlateNumber, setLicensePlateNumber] = useState('');
  const [carType, setCarType] = useState('');
  const [clientName, setClientName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const assignCar = useAssignCar();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignCar.mutate(
      {
        spotId: spot.id,
        payload:
          tab === 'existing'
            ? { carId }
            : {
                carId,
                newCar: { licensePlateNumber, carType, clientName, deliveryDate: deliveryDate || undefined },
              },
      },
      { onSuccess: onClose },
    );
  };

  const error = assignCar.error;
  const errorMessage =
    error instanceof ApiError ? ERROR_COPY[error.error] ?? error.message : error ? 'Something went wrong.' : null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Add car to spot {spot.label}</h3>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded ${tab === 'existing' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
            onClick={() => setTab('existing')}
          >
            Existing car
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded ${tab === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}
            onClick={() => setTab('new')}
          >
            New car
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm">
            Chassis number
            <input
              className="mt-1 w-full border rounded px-2 py-1.5"
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
              maxLength={50}
              required
            />
          </label>

          {tab === 'new' && (
            <CarFieldsInputs
              licensePlateNumber={licensePlateNumber}
              carType={carType}
              clientName={clientName}
              deliveryDate={deliveryDate}
              onLicensePlateNumberChange={setLicensePlateNumber}
              onCarTypeChange={setCarType}
              onClientNameChange={setClientName}
              onDeliveryDateChange={setDeliveryDate}
            />
          )}

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
              disabled={assignCar.isPending}
            >
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
