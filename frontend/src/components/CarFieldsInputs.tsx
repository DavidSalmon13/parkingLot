interface CarFieldsInputsProps {
  licensePlateNumber: string;
  carType: string;
  clientName: string;
  deliveryDate: string;
  onLicensePlateNumberChange: (value: string) => void;
  onCarTypeChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
}

export function CarFieldsInputs({
  licensePlateNumber,
  carType,
  clientName,
  deliveryDate,
  onLicensePlateNumberChange,
  onCarTypeChange,
  onClientNameChange,
  onDeliveryDateChange,
}: CarFieldsInputsProps) {
  return (
    <>
      <label className="text-sm">
        License plate number
        <input
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={licensePlateNumber}
          onChange={(e) => onLicensePlateNumberChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Car type
        <input
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={carType}
          onChange={(e) => onCarTypeChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Client name
        <input
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Delivery date (optional)
        <input
          type="date"
          className="mt-1 w-full border rounded px-2 py-1.5"
          value={deliveryDate}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
        />
      </label>
    </>
  );
}
