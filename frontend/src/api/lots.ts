import { client } from './client';
import type { CreateLotPayload, GridPayload, Lot, Spot, UpdateLotPayload } from '../types';

export function fetchLots(): Promise<Lot[]> {
  return client.get<Lot[]>('/lots').then((res) => res.data);
}

export function createLot(payload: CreateLotPayload): Promise<Lot> {
  return client.post<Lot>('/lots', payload).then((res) => res.data);
}

export function renameLot(lotId: string, payload: UpdateLotPayload): Promise<Lot> {
  return client.put<Lot>(`/lots/${lotId}`, payload).then((res) => res.data);
}

export function deleteLot(lotId: string): Promise<void> {
  return client.delete(`/lots/${lotId}`).then(() => undefined);
}

export function generateSpots(lotId: string, payload: GridPayload): Promise<Spot[]> {
  return client.post<Spot[]>(`/lots/${lotId}/spots/generate`, payload).then((res) => res.data);
}

export function addRow(lotId: string): Promise<Spot> {
  return client.post<Spot>(`/lots/${lotId}/rows`).then((res) => res.data);
}

export function removeLastRow(lotId: string): Promise<void> {
  return client.delete(`/lots/${lotId}/rows/last`).then(() => undefined);
}
