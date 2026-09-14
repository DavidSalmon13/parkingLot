interface SpotTooltipProps {
  lotName: string;
  spotLabel: string;
}

export function SpotTooltip({ lotName, spotLabel }: SpotTooltipProps) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg z-10 pointer-events-none">
      {lotName} → Spot {spotLabel}
    </div>
  );
}
