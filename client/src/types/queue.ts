export interface OpdQueueEntry {
  id: number;
  hospitalId: number;
  doctorId: number;
  appointmentId: number | null;
  patientId: number;
  queueDate: string;
  tokenNumber: number;
  position: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'no_show' | 'cancelled';
  checkedInAt: string | null;
  calledAt: string | null;
  consultationStartedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  appointment?: {
    id: number;
    reason: string;
    timeSlot: string;
    appointmentTime: string;
  };
  patient?: {
    id: number;
    user?: {
      fullName: string;
      mobileNumber: string;
    };
    dateOfBirth?: string;
  };
  doctor?: {
    id: number;
    user?: {
      fullName: string;
    };
  };
}




