export const DEFAULT_CAR_EMOJI = '🚗';

const CAR_EMOJIS = ['🚗', '🚙', '🚕', '🚓', '🏎️', '🛻', '🚐', '🚚', '🚌', '🚑', '🚒', '🏍️'];

interface CarFieldsInputsProps {
  emoji: string;
  licensePlateNumber: string;
  carType: string;
  clientName: string;
  deliveryDate: string;
  onEmojiChange: (value: string) => void;
  onLicensePlateNumberChange: (value: string) => void;
  onCarTypeChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
}

export function CarFieldsInputs({
  emoji,
  licensePlateNumber,
  carType,
  clientName,
  deliveryDate,
  onEmojiChange,
  onLicensePlateNumberChange,
  onCarTypeChange,
  onClientNameChange,
  onDeliveryDateChange,
}: CarFieldsInputsProps) {
  return (
    <>
      <div className="text-sm text-zinc-300">
        אימוג'י
        <div className="mt-1 flex flex-wrap gap-1" role="radiogroup">
          {CAR_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={emoji === option}
              className={`w-9 h-9 rounded-md text-xl leading-none transition-colors ${emoji === option ? 'bg-amber-500/30 ring-2 ring-amber-400' : 'bg-zinc-800 hover:bg-zinc-700'}`}
              onClick={() => onEmojiChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <label className="text-sm text-zinc-300">
        מספר רישוי (אופציונלי)
        <input
          className="input-field mt-1"
          value={licensePlateNumber}
          onChange={(e) => onLicensePlateNumberChange(e.target.value)}
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
