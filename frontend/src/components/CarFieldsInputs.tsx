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
        מספר רישוי
        <input
          className="input-field mt-1"
          value={licensePlateNumber}
          onChange={(e) => onLicensePlateNumberChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm text-zinc-300">
        סוג רכב
        <input
          className="input-field mt-1"
          value={carType}
          onChange={(e) => onCarTypeChange(e.target.value)}
          required
        />
      </label>
      <label className="text-sm text-zinc-300">
        שם הלקוח (אופציונלי)
        <input
          className="input-field mt-1"
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
        />
      </label>
      <label className="text-sm text-zinc-300">
        תאריך אספקה (אופציונלי)
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
