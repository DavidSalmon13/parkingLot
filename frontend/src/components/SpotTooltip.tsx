interface SpotTooltipProps {
  lotName: string;
  spotLabel: string;
}

export function SpotTooltip({ lotName, spotLabel }: SpotTooltipProps) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded bg-zinc-950 border border-amber-500/30 px-2 py-1 text-xs text-amber-200 shadow-lg shadow-black/50 z-10 pointer-events-none">
      {lotName} → Spot {spotLabel}
    </div>
  );
}
