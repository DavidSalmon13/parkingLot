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
      <label className="text-sm text-zinc-300">
        License plate number
        <input
          className="input-field mt-1"
          value={licensePlateNumber}
          onChange={(e) => onLicensePlateNumberChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm text-zinc-300">
        Car type
        <input
          className="input-field mt-1"
          value={carType}
          onChange={(e) => onCarTypeChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm text-zinc-300">
        Client name
        <input
          className="input-field mt-1"
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm text-zinc-300">
        Delivery date (optional)
        <input
          type="date"
          className="input-field mt-1 [color-scheme:dark]"
          value={deliveryDate}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
        />
      </label>
    </>
  );
}
