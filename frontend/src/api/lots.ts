import { client } from './client';
import type { Lot } from '../types';

export function fetchLots(): Promise<Lot[]> {
  return client.get<Lot[]>('/lots').then((res) => res.data);
}
