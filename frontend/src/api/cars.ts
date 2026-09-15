import { client } from './client';
import type { CarDetail, UpdateCarPayload } from '../types';

export function fetchCarDetail(carId: string): Promise<CarDetail> {
  return client.get<CarDetail>(`/cars/${carId}`).then((res) => res.data);
}

export function fetchUnassignedCars(): Promise<CarDetail[]> {
  return client.get<CarDetail[]>('/cars/unassigned').then((res) => res.data);
}

export function updateCar(carId: string, payload: UpdateCarPayload): Promise<CarDetail> {
  return client.put<CarDetail>(`/cars/${carId}`, payload).then((res) => res.data);
}
