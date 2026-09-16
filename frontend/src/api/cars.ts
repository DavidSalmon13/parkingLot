import { client } from './client';
import type { CarDetail, CreateCarPayload, UpdateCarPayload } from '../types';

export function createCar(payload: CreateCarPayload): Promise<CarDetail> {
  return client.post<CarDetail>('/cars', payload).then((res) => res.data);
}

export function fetchCarDetail(carId: string): Promise<CarDetail> {
  return client.get<CarDetail>(`/cars/${carId}`).then((res) => res.data);
}

export function fetchUnassignedCars(): Promise<CarDetail[]> {
  return client.get<CarDetail[]>('/cars/unassigned').then((res) => res.data);
}

export function updateCar(carId: string, payload: UpdateCarPayload): Promise<CarDetail> {
  return client.put<CarDetail>(`/cars/${carId}`, payload).then((res) => res.data);
}

export function deleteCar(carId: string): Promise<void> {
  return client.delete(`/cars/${carId}`).then(() => undefined);
}
