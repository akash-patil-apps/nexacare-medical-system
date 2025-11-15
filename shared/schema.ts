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
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
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
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"), // to see when doctor updated the given prescription
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

export const statesRelations = relations(states, ({ many }) => ({
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  state: one(states, { fields: [cities.stateId], references: [states.id] }),
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

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
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
