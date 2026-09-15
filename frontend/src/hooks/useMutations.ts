import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { assignCar, removeCar } from '../api/spots';
import { addSpot, deleteSpot, updateSpot } from '../api/spots';
import { createLot, deleteLot, generateSpots, renameLot } from '../api/lots';
import { updateCar } from '../api/cars';
import type {
  AssignCarPayload,
  CarDetail,
  CreateLotPayload,
  CreateSpotPayload,
  GridPayload,
  UpdateCarPayload,
  UpdateLotPayload,
  UpdateSpotPayload,
} from '../types';

// No cache invalidation here — the WebSocket push (useLotSocket) is the
// source of truth for updating the dashboard/admin views (spec §4.3/§6.4),
// including for the client that made the change. These hooks exist purely
// to drive each call site's own loading/error UI (closing a modal, showing
// an inline error), via the onSuccess/onError passed to `.mutate()`.
export function useAssignCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spotId, payload }: { spotId: string; payload: AssignCarPayload }) => assignCar(spotId, payload),
    onError: (error) => {
      // Spec §7.12: the spot/lot may have been deleted by someone else since
      // this client last fetched — a 404 here means the local view is stale,
      // so resync it instead of waiting for the next WS push or 30s poll.
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['lots'] });
      }
    },
  });
}

export function useRemoveCar() {
  return useMutation({
    mutationFn: (spotId: string) => removeCar(spotId),
  });
}

export function useUpdateCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ carId, payload }: { carId: string; payload: UpdateCarPayload }) => updateCar(carId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['car', updated.chassisNumber], updated);
      queryClient.setQueryData<CarDetail[]>(['cars', 'unassigned'], (old) =>
        old?.map((car) => (car.chassisNumber === updated.chassisNumber ? updated : car)),
      );
    },
  });
}

export function useCreateLot() {
  return useMutation({
    mutationFn: (payload: CreateLotPayload) => createLot(payload),
  });
}

export function useRenameLot() {
  return useMutation({
    mutationFn: ({ lotId, payload }: { lotId: string; payload: UpdateLotPayload }) => renameLot(lotId, payload),
  });
}

export function useDeleteLot() {
  return useMutation({
    mutationFn: (lotId: string) => deleteLot(lotId),
  });
}

export function useGenerateSpots() {
  return useMutation({
    mutationFn: ({ lotId, payload }: { lotId: string; payload: GridPayload }) => generateSpots(lotId, payload),
  });
}

export function useAddSpot() {
  return useMutation({
    mutationFn: ({ lotId, payload }: { lotId: string; payload: CreateSpotPayload }) => addSpot(lotId, payload),
  });
}

export function useUpdateSpot() {
  return useMutation({
    mutationFn: ({ spotId, payload }: { spotId: string; payload: UpdateSpotPayload }) => updateSpot(spotId, payload),
  });
}

export function useDeleteSpot() {
  return useMutation({
    mutationFn: (spotId: string) => deleteSpot(spotId),
  });
}
