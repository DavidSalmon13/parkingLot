import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignCar, removeCar } from '../api/spots';
import type { AssignCarPayload } from '../types';

// Invalidating ['lots'] on success gives immediate feedback until §6 wires
// up the WebSocket push, which will become the real source of truth for
// updates (per spec §4.3) — this refetch-on-success will likely become
// redundant (but harmless) once that lands.
export function useAssignCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spotId, payload }: { spotId: string; payload: AssignCarPayload }) => assignCar(spotId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

export function useRemoveCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spotId: string) => removeCar(spotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}
