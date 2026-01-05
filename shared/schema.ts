import {
  pgTable,
  varchar,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// States table - Reference data for Indian states
export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  country: text("country").default('India').notNull(),
  iso2: text("iso2").default('IN').notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Cities table - Reference data for Indian cities
export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stateId: integer("state_id").references(() => states.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  mobileNumber: varchar("mobile_number", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Hospitals
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  licenseNumber: text("license_number").notNull(),
  contactEmail: text("contact_email"),
  website: text("website"),
  establishedYear: integer("established_year"),
  totalBeds: integer("total_beds"),
  departments: text("departments"),
  services: text("services"),
  photos: text("photos"),
  operatingHours: text("operating_hours"),
  emergencyServices: boolean("emergency_services").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  isVerified: boolean("is_verified").default(false),
});

// Doctors
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  specialty: text("specialty").notNull(),
  licenseNumber: text("license_number").notNull(),
  qualification: text("qualification").notNull(),
  experience: integer("experience"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  workingHours: text("working_hours"),
  availableSlots: text("available_slots"),
  status: text("status").default("in"),
  languages: text("languages"),
  awards: text("awards"),
  bio: text("bio"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  isVerified: boolean("is_verified").default(false),
  approvalStatus: text("approval_status").default("pending"),
});

// Patients
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  height: decimal("height", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  emergencyContact: text("emergency_contact"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyRelation: text("emergency_relation"),
  medicalHistory: text("medical_history"),
  allergies: text("allergies"),
  currentMedications: text("current_medications"),
  chronicConditions: text("chronic_conditions"),
  insuranceProvider: text("insurance_provider"),
  insuranceNumber: text("insurance_number"),
  occupation: text("occupation"),
  maritalStatus: text("marital_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Labs
export const labs = pgTable("labs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  licenseNumber: text("license_number").notNull(),
  contactEmail: text("contact_email"),
  operatingHours: text("operating_hours"),
  specializations: text("specializations"),
  testCategories: text("test_categories"),
  equipment: text("equipment"),
  accreditation: text("accreditation"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  isVerified: boolean("is_verified").default(false),
  approvalStatus: text("approval_status").default("pending"),
});

// Receptionists
export const receptionists = pgTable("receptionists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  employeeId: text("employee_id"),
  department: text("department"),
  shift: text("shift"),
  workingHours: text("working_hours"),
  permissions: text("permissions"),
  dateOfJoining: timestamp("date_of_joining"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  receptionistId: integer("receptionist_id").references(() => receptionists.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(),
  timeSlot: text("time_slot").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"),
  type: text("type").default("online"),
  priority: text("priority").default("normal"),
  symptoms: text("symptoms"),
  notes: text("notes"),
  // OPD token/queue basics (v1)
  tokenNumber: integer("token_number"),
  checkedInAt: timestamp("checked_in_at"),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  // Appointment rescheduling (v1)
  rescheduledAt: timestamp("rescheduled_at"),
  rescheduledFromDate: timestamp("rescheduled_from_date"),
  rescheduledFromTimeSlot: text("rescheduled_from_time_slot"),
  rescheduleReason: text("reschedule_reason"),
  rescheduledBy: integer("rescheduled_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prescriptions
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  diagnosis: text("diagnosis").notNull(),
  medications: text("medications").notNull(), // JSON string with detailed medication info
  instructions: text("instructions"),
  followUpDate: timestamp("follow_up_date"),
  editableUntil: timestamp("editable_until"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"), // to see when doctor updated the given prescription
});

export const prescriptionAudits = pgTable("prescription_audits", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  action: text("action").notNull(), // created | updated | extended
  message: text("message").notNull(), // human readable summary
  createdAt: timestamp("created_at").defaultNow(),
});

// Lab Reports
export const labReports = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  labId: integer("lab_id").references(() => labs.id).notNull(),
  testName: text("test_name").notNull(),
  testType: text("test_type").notNull(),
  results: text("results").notNull(),
  normalRanges: text("normal_ranges"),
  reportDate: timestamp("report_date").notNull(),
  reportUrl: text("report_url"),
  status: text("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// OTPs
export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  mobileNumber: text("mobile_number").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// RELATIONS
export const usersRelations = relations(users, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [users.id], references: [hospitals.userId] }),
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  lab: one(labs, { fields: [users.id], references: [labs.userId] }),
  receptionist: one(receptionists, { fields: [users.id], references: [receptionists.userId] }),
  notifications: many(notifications),
}));

export const hospitalsRelations = relations(hospitals, ({ one, many }) => ({
  user: one(users, { fields: [hospitals.userId], references: [users.id] }),
  doctors: many(doctors),
  receptionists: many(receptionists),
  appointments: many(appointments),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [doctors.hospitalId], references: [hospitals.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  labReports: many(labReports),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  labReports: many(labReports),
}));

export const labsRelations = relations(labs, ({ one, many }) => ({
  user: one(users, { fields: [labs.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [labs.hospitalId], references: [hospitals.id] }),
  labReports: many(labReports),
}));

export const receptionistsRelations = relations(receptionists, ({ one }) => ({
  user: one(users, { fields: [receptionists.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [receptionists.hospitalId], references: [hospitals.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  hospital: one(hospitals, { fields: [appointments.hospitalId], references: [hospitals.id] }),
  receptionist: one(receptionists, { fields: [appointments.receptionistId], references: [receptionists.id] }),
  prescription: one(prescriptions, { fields: [appointments.id], references: [prescriptions.appointmentId] }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, { fields: [prescriptions.appointmentId], references: [appointments.id] }),
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [prescriptions.doctorId], references: [doctors.id] }),
}));

export const labReportsRelations = relations(labReports, ({ one }) => ({
  patient: one(patients, { fields: [labReports.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [labReports.doctorId], references: [doctors.id] }),
  lab: one(labs, { fields: [labReports.labId], references: [labs.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// OPD Queue Entries
export const opdQueueEntries = pgTable("opd_queue_entries", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  queueDate: text("queue_date").notNull(), // YYYY-MM-DD in IST
  tokenNumber: integer("token_number").notNull(),
  position: integer("position").notNull(), // order in queue
  status: text("status").default("waiting").notNull(), // waiting, called, in_consultation, completed, skipped, no_show, cancelled
  checkedInAt: timestamp("checked_in_at"),
  calledAt: timestamp("called_at"),
  consultationStartedAt: timestamp("consultation_started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    doctorDateTokenUnique: unique().on(table.doctorId, table.queueDate, table.tokenNumber),
    appointmentUnique: unique().on(table.appointmentId),
  };
});

// IPD Floors (optional hierarchy level)
export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  floorNumber: integer("floor_number").notNull(), // 0 = Ground, 1 = First, -1 = Basement, etc.
  floorName: text("floor_name"), // Optional: "Ground Floor", "First Floor", "ICU Floor", etc.
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// IPD Wards
export const wards = pgTable("wards", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  floorId: integer("floor_id").references(() => floors.id), // Optional: null if no floor structure
  name: text("name").notNull(),
  type: text("type").notNull(), // general, icu, er, pediatric, maternity, surgical, etc.
  genderPolicy: text("gender_policy"), // male, female, mixed, null
  capacity: integer("capacity"), // Total bed capacity
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// IPD Rooms
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  wardId: integer("ward_id").references(() => wards.id).notNull(),
  roomNumber: text("room_number").notNull(),
  roomName: text("room_name"), // Optional: "VIP Suite", "Deluxe Room", etc.
  category: text("category").notNull(), // general, semi, private, deluxe, vip, icu, etc.
  capacity: integer("capacity"), // Number of beds in this room
  amenities: text("amenities"), // JSON: ["AC", "TV", "Attached Bathroom", etc.]
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// IPD Beds
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  bedNumber: text("bed_number").notNull(),
  bedName: text("bed_name"), // Optional: "Bed A", "Bed 1", etc.
  status: text("status").default("available").notNull(), // available, occupied, cleaning, blocked, maintenance
  bedType: text("bed_type"), // standard, electric, manual, icu, etc.
  equipment: text("equipment"), // JSON: ["Ventilator", "Monitor", "Oxygen", etc.]
  notes: text("notes"), // Special notes about this bed
  lastCleanedAt: timestamp("last_cleaned_at"),
  blockedReason: text("blocked_reason"), // Why bed is blocked
  blockedUntil: timestamp("blocked_until"), // When block expires
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// IPD Encounters
export const ipdEncounters = pgTable("ipd_encounters", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  admittingDoctorId: integer("admitting_doctor_id").references(() => doctors.id),
  attendingDoctorId: integer("attending_doctor_id").references(() => doctors.id),
  admissionType: text("admission_type").notNull(), // elective, emergency, daycare, observation
  status: text("status").default("admitted").notNull(), // admitted, transferred, discharged
  admittedAt: timestamp("admitted_at").defaultNow(),
  dischargedAt: timestamp("discharged_at"),
  dischargeSummaryText: text("discharge_summary_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Bed Allocations (for transfers)
export const bedAllocations = pgTable("bed_allocations", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  bedId: integer("bed_id").references(() => beds.id).notNull(),
  fromAt: timestamp("from_at").defaultNow(),
  toAt: timestamp("to_at"), // null if current allocation
  reason: text("reason"), // Transfer reason or "Initial admission"
  transferredBy: integer("transferred_by").references(() => users.id), // User who performed transfer
  createdAt: timestamp("created_at").defaultNow(),
});

export const statesRelations = relations(states, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  state: one(states, { fields: [cities.stateId], references: [states.id] }),
}));

// Queue Relations
export const opdQueueEntriesRelations = relations(opdQueueEntries, ({ one }) => ({
  hospital: one(hospitals, { fields: [opdQueueEntries.hospitalId], references: [hospitals.id] }),
  doctor: one(doctors, { fields: [opdQueueEntries.doctorId], references: [doctors.id] }),
  appointment: one(appointments, { fields: [opdQueueEntries.appointmentId], references: [appointments.id] }),
  patient: one(patients, { fields: [opdQueueEntries.patientId], references: [patients.id] }),
}));

// IPD Relations
export const floorsRelations = relations(floors, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [floors.hospitalId], references: [hospitals.id] }),
  wards: many(wards),
}));

export const wardsRelations = relations(wards, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [wards.hospitalId], references: [hospitals.id] }),
  floor: one(floors, { fields: [wards.floorId], references: [floors.id] }),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  ward: one(wards, { fields: [rooms.wardId], references: [wards.id] }),
  beds: many(beds),
}));

export const bedsRelations = relations(beds, ({ one, many }) => ({
  room: one(rooms, { fields: [beds.roomId], references: [rooms.id] }),
  allocations: many(bedAllocations),
}));

export const ipdEncountersRelations = relations(ipdEncounters, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [ipdEncounters.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [ipdEncounters.patientId], references: [patients.id] }),
  admittingDoctor: one(doctors, { fields: [ipdEncounters.admittingDoctorId], references: [doctors.id] }),
  attendingDoctor: one(doctors, { fields: [ipdEncounters.attendingDoctorId], references: [doctors.id] }),
  bedAllocations: many(bedAllocations),
}));

export const bedAllocationsRelations = relations(bedAllocations, ({ one }) => ({
  encounter: one(ipdEncounters, { fields: [bedAllocations.encounterId], references: [ipdEncounters.id] }),
  bed: one(beds, { fields: [bedAllocations.bedId], references: [beds.id] }),
}));

// ZOD VALIDATION SCHEMAS
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registrationSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['hospital', 'doctor', 'patient', 'lab']),
});


export const loginSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
  password: z.string().min(6),
});

export const otpVerificationSchema = z.object({
  mobileNumber: z.string().min(10).max(15),
  otp: z.string().length(6),
  password: z.string().min(6).optional(), // Password is optional - only needed during registration step
});
export const insertHospitalSchema = createInsertSchema(hospitals).omit({
  id: true,
  createdAt: true,
});
export const insertOtpSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
  isUsed: true,
});
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

// Medication interface for detailed prescription
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  timing: string; // before/after meals, morning/evening, etc.
  duration: string; // how long to take
  instructions: string; // special instructions
  quantity: number; // number of tablets/capsules
  unit: string; // tablets, ml, mg, etc.
}

// Manual Zod schema for prescriptions (avoiding createInsertSchema compatibility issues with Zod v3.25+)
// NOTE: followUpDate is removed from form - the database column still exists but is unused
export const insertPrescriptionSchema = z.object({
  appointmentId: z.number().int().positive().optional().nullable(),
  patientId: z.number().int().positive(),
  hospitalId: z.number().int().positive(),
  diagnosis: z.string().min(1),
  medications: z.string().min(1), // JSON string
  instructions: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updatePrescriptionSchema = insertPrescriptionSchema.partial();



// TYPES
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type InsertUser = InferInsertModel<typeof users>;
export type User = InferSelectModel<typeof users>;

export type InsertHospital = InferInsertModel<typeof hospitals>;
export type Hospital = InferSelectModel<typeof hospitals>;

export type InsertDoctor = InferInsertModel<typeof doctors>;
export type Doctor = InferSelectModel<typeof doctors>;

export type InsertPatient = InferInsertModel<typeof patients>;
export type Patient = InferSelectModel<typeof patients>;

export type InsertLab = InferInsertModel<typeof labs>;
export type Lab = InferSelectModel<typeof labs>;

export type InsertReceptionist = InferInsertModel<typeof receptionists>;
export type Receptionist = InferSelectModel<typeof receptionists>;

export type InsertAppointment = InferInsertModel<typeof appointments>;
export type Appointment = InferSelectModel<typeof appointments>;

export type InsertPrescription = InferInsertModel<typeof prescriptions>;
export type Prescription = InferSelectModel<typeof prescriptions>;

export type InsertLabReport = InferInsertModel<typeof labReports>;
export type LabReport = InferSelectModel<typeof labReports>;

export type InsertOtp = InferInsertModel<typeof otpVerifications>;
export type OtpVerification = InferSelectModel<typeof otpVerifications>;

export type InsertNotification = InferInsertModel<typeof notifications>;
export type Notification = InferSelectModel<typeof notifications>;

export type InsertOpdQueueEntry = InferInsertModel<typeof opdQueueEntries>;
export type OpdQueueEntry = InferSelectModel<typeof opdQueueEntries>;

export type InsertWard = InferInsertModel<typeof wards>;
export type Ward = InferSelectModel<typeof wards>;

export type InsertRoom = InferInsertModel<typeof rooms>;
export type Room = InferSelectModel<typeof rooms>;

export type InsertBed = InferInsertModel<typeof beds>;
export type Bed = InferSelectModel<typeof beds>;

export type InsertIpdEncounter = InferInsertModel<typeof ipdEncounters>;
export type IpdEncounter = InferSelectModel<typeof ipdEncounters>;

export type InsertBedAllocation = InferInsertModel<typeof bedAllocations>;
export type BedAllocation = InferSelectModel<typeof bedAllocations>;

export type InsertFloor = InferInsertModel<typeof floors>;
export type Floor = InferSelectModel<typeof floors>;
