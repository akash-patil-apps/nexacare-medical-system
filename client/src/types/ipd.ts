export interface Floor {
  id: number;
  hospitalId: number;
  floorNumber: number;
  floorName: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Ward {
  id: number;
  hospitalId: number;
  floorId: number | null;
  name: string;
  type: string;
  genderPolicy: string | null;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  floor?: Floor;
}

export interface Room {
  id: number;
  wardId: number;
  roomNumber: string;
  roomName: string | null;
  category: string;
  capacity: number | null;
  amenities: string | null; // JSON string
  isActive: boolean;
  createdAt: string;
  ward?: Ward;
}

export interface Bed {
  id: number;
  roomId: number;
  bedNumber: string;
  bedName: string | null;
  status: 'available' | 'occupied' | 'cleaning' | 'blocked' | 'maintenance';
  bedType: string | null;
  equipment: string | null; // JSON string
  notes: string | null;
  lastCleanedAt: string | null;
  blockedReason: string | null;
  blockedUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
  room?: Room;
}

export interface IpdEncounter {
  id: number;
  hospitalId: number;
  patientId: number;
  admittingDoctorId: number | null;
  attendingDoctorId: number | null;
  admissionType: 'elective' | 'emergency' | 'day_care' | 'observation';
  status: 'admitted' | 'transferred' | 'discharged' | 'LAMA' | 'absconded' | 'death';
  admittedAt: string;
  expectedDischargeAt: string | null;
  dischargedAt: string | null;
  dischargeSummaryText: string | null;
  admissionNotes: string | null;
  currentBedId: number | null;
  createdAt: string;
  updatedAt: string | null;
  patient?: {
    id: number;
    user?: {
      fullName: string;
      mobileNumber: string;
    };
  };
  admittingDoctor?: {
    id: number;
    user?: {
      fullName: string;
    };
  };
  attendingDoctor?: {
    id: number;
    user?: {
      fullName: string;
    };
  };
  currentBed?: Bed;
}

export interface BedAllocation {
  id: number;
  encounterId: number;
  bedId: number;
  fromAt: string;
  toAt: string | null;
  reason: string | null;
  transferredBy: number | null;
  createdAt: string;
  bed?: Bed;
}

export interface BedStructure {
  floors: Floor[];
  wards: Ward[];
  rooms: Room[];
  beds: Bed[];
}








