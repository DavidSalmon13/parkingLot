import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUnassignedCars } from '../api/cars';
import { useUpdateCar } from '../hooks/useMutations';
import { ApiError } from '../api/client';
import { CarFieldsInputs } from './CarFieldsInputs';
import type { CarDetail } from '../types';

interface UnassignedCarsPanelProps {
  onClose: () => void;
}

export function UnassignedCarsPanel({ onClose }: UnassignedCarsPanelProps) {
  const { data: cars, isLoading, isError } = useQuery({
    queryKey: ['cars', 'unassigned'],
    queryFn: fetchUnassignedCars,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Unassigned cars</h3>
          <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300" onClick={onClose}>
            Close
          </button>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        {isError && <p className="text-sm text-red-600">Failed to load unassigned cars.</p>}
        {cars && cars.length === 0 && <p className="text-sm text-gray-500">No unassigned cars.</p>}

        <div className="flex flex-col gap-3 overflow-y-auto">
          {cars?.map((car) => (
            <UnassignedCarRow
              key={car.chassisNumber}
              car={car}
              editing={editingId === car.chassisNumber}
              onStartEdit={() => setEditingId(car.chassisNumber)}
              onStopEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface UnassignedCarRowProps {
  car: CarDetail;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

function UnassignedCarRow({ car, editing, onStartEdit, onStopEdit }: UnassignedCarRowProps) {
  const [licensePlateNumber, setLicensePlateNumber] = useState(car.licensePlateNumber);
  const [carType, setCarType] = useState(car.carType);
  const [clientName, setClientName] = useState(car.clientName);
  const [deliveryDate, setDeliveryDate] = useState(car.deliveryDate ?? '');
  const updateCar = useUpdateCar();

  const startEdit = () => {
    updateCar.reset();
    setLicensePlateNumber(car.licensePlateNumber);
    setCarType(car.carType);
    setClientName(car.clientName);
    setDeliveryDate(car.deliveryDate ?? '');
    onStartEdit();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCar.mutate(
      { carId: car.chassisNumber, payload: { licensePlateNumber, carType, clientName, deliveryDate: deliveryDate || undefined } },
      { onSuccess: onStopEdit },
    );
  };

  const error = updateCar.error;
  const errorMessage = error instanceof ApiError ? error.message : error ? 'Something went wrong.' : null;

  if (!editing) {
    return (
      <div className="border rounded p-3 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{car.chassisNumber}</h4>
          <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300" onClick={startEdit}>
            Edit
          </button>
        </div>
        <p className="text-sm">{car.clientName}</p>
        <p className="text-sm text-gray-600">License plate: {car.licensePlateNumber}</p>
        <p className="text-sm text-gray-600">Car type: {car.carType}</p>
        {car.deliveryDate && <p className="text-sm text-gray-600">Delivery date: {car.deliveryDate}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="border rounded p-3 flex flex-col gap-2">
      <h4 className="font-semibold">{car.chassisNumber}</h4>
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

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300" onClick={onStopEdit}>
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
  );
}
