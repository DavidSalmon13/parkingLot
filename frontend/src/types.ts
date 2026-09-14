export interface CarSummary {
  id: string;
  ownerName: string;
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
  id: string;
  ownerName: string;
  employeeId: string;
  phoneNumber: string | null;
  notes: string | null;
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
  ownerName: string;
  employeeId: string;
  phoneNumber?: string;
  notes?: string;
}

export interface AssignCarPayload {
  carId: string;
  newCar?: NewCarDetails;
}

// Mirrors the WebSocket message envelope from spec §6.3 (wired up in §6).
export interface SpotUpdateEvent {
  type: 'SPOT_UPDATED' | 'SPOT_CREATED' | 'SPOT_DELETED';
  lotId: string;
  spot: Spot;
}
