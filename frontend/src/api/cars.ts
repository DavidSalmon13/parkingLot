import { client } from './client';
import type { CarDetail } from '../types';

export function fetchCarDetail(carId: string): Promise<CarDetail> {
  return client.get<CarDetail>(`/cars/${carId}`).then((res) => res.data);
}
