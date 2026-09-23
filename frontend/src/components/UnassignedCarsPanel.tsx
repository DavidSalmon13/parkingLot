import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUnassignedCars } from '../api/cars';
import { useCreateCar, useDeleteCar, useUpdateCar } from '../hooks/useMutations';
import { ApiError } from '../api/client';
import { CarFieldsInputs } from './CarFieldsInputs';
import type { CarDetail } from '../types';

interface UnassignedCarsPanelProps {
  onClose: () => void;
}

const CREATE_ERROR_COPY: Record<string, string> = {
  CAR_ID_EXISTS: 'מספר השלדה הזה כבר רשום במערכת.',
};

export function UnassignedCarsPanel({ onClose }: UnassignedCarsPanelProps) {
  const { data: cars, isLoading, isError } = useQuery({
    queryKey: ['cars', 'unassigned'],
    queryFn: fetchUnassignedCars,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20" onClick={onClose}>
      <div
        className="surface-modal p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">
            רכבים <span className="text-amber-400">לא משויכים</span>
          </h3>
          <div className="flex gap-2">
            {!adding && (
              <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
                רכב חדש
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              סגירה
            </button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-zinc-400">טוען...</p>}
        {isError && <p className="text-sm text-rose-400">טעינת הרכבים הלא משויכים נכשלה.</p>}
        {cars && cars.length === 0 && !adding && <p className="text-sm text-zinc-500">אין רכבים לא משויכים.</p>}

        <div className="flex flex-col gap-3 overflow-y-auto">
          {adding && <NewCarForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />}
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

interface NewCarFormProps {
  onDone: () => void;
  onCancel: () => void;
}

function NewCarForm({ onDone, onCancel }: NewCarFormProps) {
  const [chassisNumber, setChassisNumber] = useState('');
  const [licensePlateNumber, setLicensePlateNumber] = useState('');
  const [carType, setCarType] = useState('');
  const [clientName, setClientName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const createCar = useCreateCar();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createCar.mutate(
      {
        chassisNumber,
        licensePlateNumber: licensePlateNumber || undefined,
        carType,
        clientName: clientName || undefined,
        deliveryDate: deliveryDate || undefined,
      },
      { onSuccess: onDone },
    );
  };

  const error = createCar.error;
  const errorMessage =
    error instanceof ApiError ? CREATE_ERROR_COPY[error.error] ?? error.message : error ? 'משהו השתבש.' : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-amber-500/40 bg-zinc-950/60 rounded-lg p-3 flex flex-col gap-2"
    >
      <label className="text-sm text-zinc-300">
        מספר שלדה
        <input
          className="input-field mt-1"
          value={chassisNumber}
          onChange={(e) => setChassisNumber(e.target.value)}
          maxLength={50}
          required
          autoFocus
        />
      </label>
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

      {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          ביטול
        </button>
        <button type="submit" className="btn-primary" disabled={createCar.isPending}>
          הוספה
        </button>
      </div>
    </form>
  );
}

interface UnassignedCarRowProps {
  car: CarDetail;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

function UnassignedCarRow({ car, editing, onStartEdit, onStopEdit }: UnassignedCarRowProps) {
  const [licensePlateNumber, setLicensePlateNumber] = useState(car.licensePlateNumber ?? '');
  const [carType, setCarType] = useState(car.carType);
  const [clientName, setClientName] = useState(car.clientName ?? '');
  const [deliveryDate, setDeliveryDate] = useState(car.deliveryDate ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateCar = useUpdateCar();
  const deleteCar = useDeleteCar();

  const startEdit = () => {
    updateCar.reset();
    setLicensePlateNumber(car.licensePlateNumber ?? '');
    setCarType(car.carType);
    setClientName(car.clientName ?? '');
    setDeliveryDate(car.deliveryDate ?? '');
    onStartEdit();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCar.mutate(
      {
        carId: car.chassisNumber,
        payload: {
          licensePlateNumber: licensePlateNumber || undefined,
          carType,
          clientName: clientName || undefined,
          deliveryDate: deliveryDate || undefined,
        },
      },
      { onSuccess: onStopEdit },
    );
  };

  const error = updateCar.error;
  const errorMessage = error instanceof ApiError ? error.message : error ? 'משהו השתבש.' : null;

  const deleteError = deleteCar.error;
  const deleteErrorMessage = deleteError instanceof ApiError ? deleteError.message : deleteError ? 'משהו השתבש.' : null;

  if (!editing) {
    return (
      <div className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-3 flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-zinc-100 font-mono tracking-wide break-all">{car.chassisNumber}</h4>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="btn-secondary" onClick={startEdit}>
              עריכה
            </button>
            {!confirmingDelete ? (
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => {
                  deleteCar.reset();
                  setConfirmingDelete(true);
                }}
              >
                מחיקה
              </button>
            ) : (
              <>
                <button type="button" className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
                  ביטול
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={deleteCar.isPending}
                  onClick={() => deleteCar.mutate(car.chassisNumber, { onSuccess: () => setConfirmingDelete(false) })}
                >
                  אישור מחיקה
                </button>
              </>
            )}
          </div>
        </div>
        {car.clientName && <p className="text-sm text-zinc-200">{car.clientName}</p>}
        {car.licensePlateNumber && <p className="text-sm text-zinc-400">מספר רישוי: {car.licensePlateNumber}</p>}
        <p className="text-sm text-zinc-400">סוג רכב: {car.carType}</p>
        {car.deliveryDate && <p className="text-sm text-zinc-400">תאריך אספקה: {car.deliveryDate}</p>}
        {deleteErrorMessage && <p className="text-sm text-rose-400">{deleteErrorMessage}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-3 flex flex-col gap-2">
      <h4 className="font-semibold text-zinc-100 font-mono tracking-wide">{car.chassisNumber}</h4>
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

      {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onStopEdit}>
          ביטול
        </button>
        <button type="submit" className="btn-primary" disabled={updateCar.isPending}>
          שמירה
        </button>
      </div>
    </form>
  );
}
