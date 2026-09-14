import { client } from './client';
import type { AssignCarPayload, AssignmentResult } from '../types';

export function assignCar(spotId: string, payload: AssignCarPayload): Promise<AssignmentResult> {
  return client.post<AssignmentResult>(`/spots/${spotId}/assign`, payload).then((res) => res.data);
}

export function removeCar(spotId: string): Promise<void> {
  return client.delete(`/spots/${spotId}/assign`).then(() => undefined);
}
