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
  CAR_NOT_FOUND: "לא נמצא רכב עם מספר שלדה זה — עברו ל'רכב חדש' כדי לרשום אותו.",
  CAR_ID_EXISTS: "מספר השלדה הזה כבר רשום במערכת — עברו ל'רכב קיים'.",
  SPOT_OCCUPIED: 'המקום הזה נתפס הרגע על ידי מישהו אחר.',
  SPOT_NOT_FOUND: 'המקום הזה כבר לא קיים — הוא הוסר על ידי מישהו אחר. מרענן...',
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
                newCar: {
                  licensePlateNumber,
                  carType,
                  clientName: clientName || undefined,
                  deliveryDate: deliveryDate || undefined,
                },
              },
      },
      { onSuccess: onClose },
    );
  };

  const error = assignCar.error;
  const errorMessage =
    error instanceof ApiError ? ERROR_COPY[error.error] ?? error.message : error ? 'משהו השתבש.' : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20" onClick={onClose}>
      <div className="surface-modal p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 text-zinc-100">
          הוספת רכב למקום <span className="text-amber-400">{spot.label}</span>
        </h3>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === 'existing' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            onClick={() => setTab('existing')}
          >
            רכב קיים
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === 'new' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
            onClick={() => setTab('new')}
          >
            רכב חדש
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm text-zinc-300">
            מספר שלדה
            <input
              className="input-field mt-1"
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

          {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn-primary" disabled={assignCar.isPending}>
              שיוך
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
