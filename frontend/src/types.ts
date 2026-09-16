export interface CarSummary {
  chassisNumber: string;
  licensePlateNumber: string;
  carType: string;
}

export interface Spot {
  id: string;
  label: string;
  row: string;
  position: number;
  status: 'available' | 'occupied';
  car: CarSummary | null;
}

export interface Lot {
  id: string;
  name: string;
  rowLabels: string[];
  spots: Spot[];
}

export interface CarDetail {
  chassisNumber: string;
  licensePlateNumber: string;
  carType: string;
  clientName: string | null;
  deliveryDate: string | null;
  currentLocation: { lotName: string; spotLabel: string; assignedAt: string } | null;
}

export interface AssignmentResult {
  id: string;
  carId: string;
  spotId: string;
  assignedAt: string;
  lotName: string;
  spotLabel: string;
}

export interface NewCarDetails {
  licensePlateNumber: string;
  carType: string;
  clientName?: string;
  deliveryDate?: string;
}

export interface AssignCarPayload {
  carId: string;
  newCar?: NewCarDetails;
}

export interface UpdateCarPayload {
  licensePlateNumber: string;
  carType: string;
  clientName?: string;
  deliveryDate?: string;
}

export interface CreateCarPayload extends UpdateCarPayload {
  chassisNumber: string;
}

// Mirrors the WebSocket message envelope from spec §6.3.
export interface SpotUpdateEvent {
  type: 'SPOT_UPDATED' | 'SPOT_CREATED';
  lotId: string;
  spot: Spot;
}

export interface SpotDeletedEvent {
  type: 'SPOT_DELETED';
  lotId: string;
  spotId: string;
}

export interface LotCreatedEvent {
  type: 'LOT_CREATED';
  lot: Lot;
}

export interface LotUpdatedEvent {
  type: 'LOT_UPDATED';
  lot: Lot;
}

export interface LotDeletedEvent {
  type: 'LOT_DELETED';
  lotId: string;
}

export type LotUpdateEvent = SpotUpdateEvent | SpotDeletedEvent | LotCreatedEvent | LotUpdatedEvent | LotDeletedEvent;

export interface GridRowSpec {
  label: string;
  count: number;
}

export interface GridPayload {
  rows: GridRowSpec[];
}

export interface CreateLotPayload {
  name: string;
  grid?: GridPayload;
}

export interface UpdateLotPayload {
  name: string;
}

export interface CreateSpotPayload {
  label: string;
  row: string;
  position: number;
}

export interface UpdateSpotPayload {
  label: string;
  row: string;
  position: number;
}
