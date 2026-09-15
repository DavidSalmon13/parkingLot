import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCarDetail } from '../api/cars';
import { useRemoveCar, useUpdateCar } from '../hooks/useMutations';
import { ApiError } from '../api/client';
import { CarFieldsInputs } from './CarFieldsInputs';
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
    updateError instanceof ApiError ? updateError.message : updateError ? 'משהו השתבש.' : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20" onClick={onClose}>
      <div
        className="surface-modal p-6 w-full max-w-sm transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-zinc-500">
          {lotName} / <span className="text-amber-400">{spot.label}</span>
        </div>

        {isLoading && <p className="mt-4 text-sm text-zinc-400">טוען...</p>}

        {car && !editing && (
          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-xl font-semibold text-zinc-100 font-mono tracking-wide">{car.chassisNumber}</h3>
            <p className="text-zinc-200">{car.clientName}</p>
            <p className="text-sm text-zinc-400">מספר רישוי: {car.licensePlateNumber}</p>
            <p className="text-sm text-zinc-400">סוג רכב: {car.carType}</p>
            {car.deliveryDate && <p className="text-sm text-zinc-400">תאריך אספקה: {car.deliveryDate}</p>}
            {car.currentLocation && (
              <p className="text-xs text-zinc-500">
                בחניה מאז {new Date(car.currentLocation.assignedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {car && editing && (
          <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
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

            {updateErrorMessage && <p className="text-sm text-rose-400">{updateErrorMessage}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                ביטול
              </button>
              <button type="submit" className="btn-primary" disabled={updateCar.isPending}>
                שמירה
              </button>
            </div>
          </form>
        )}

        {car && !editing && !confirmingRemove && (
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              סגירה
            </button>
            <button type="button" className="btn-secondary" onClick={startEditing}>
              עריכה
            </button>
            <button type="button" className="btn-danger" onClick={() => setConfirmingRemove(true)}>
              הסרת רכב
            </button>
          </div>
        )}

        {confirmingRemove && (
          <div className="mt-6 flex justify-end gap-2">
            <span className="text-sm text-zinc-400 mr-auto self-center">בטוחים?</span>
            <button type="button" className="btn-secondary" onClick={() => setConfirmingRemove(false)}>
              ביטול
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={removeCar.isPending}
              onClick={() => removeCar.mutate(spot.id, { onSuccess: onClose })}
            >
              אישור הסרה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
