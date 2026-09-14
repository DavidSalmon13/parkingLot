import { client } from './client';
import type { AssignCarPayload, AssignmentResult, CreateSpotPayload, Spot, UpdateSpotPayload } from '../types';

export function assignCar(spotId: string, payload: AssignCarPayload): Promise<AssignmentResult> {
  return client.post<AssignmentResult>(`/spots/${spotId}/assign`, payload).then((res) => res.data);
}

export function removeCar(spotId: string): Promise<void> {
  return client.delete(`/spots/${spotId}/assign`).then(() => undefined);
}

export function addSpot(lotId: string, payload: CreateSpotPayload): Promise<Spot> {
  return client.post<Spot>(`/lots/${lotId}/spots`, payload).then((res) => res.data);
}

export function updateSpot(spotId: string, payload: UpdateSpotPayload): Promise<Spot> {
  return client.put<Spot>(`/spots/${spotId}`, payload).then((res) => res.data);
}

export function deleteSpot(spotId: string): Promise<void> {
  return client.delete(`/spots/${spotId}`).then(() => undefined);
}
