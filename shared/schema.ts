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

// Nurses
export const nurses = pgTable("nurses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  nursingDegree: text("nursing_degree").notNull(), // BSc Nursing, GNM, etc.
  licenseNumber: text("license_number").notNull(),
  specialization: text("specialization"), // ICU, Pediatrics, Oncology, etc.
  experience: integer("experience"),
  shiftType: text("shift_type").default("day"), // day, night, rotation
  workingHours: text("working_hours"),
  wardPreferences: text("ward_preferences"), // JSON array of preferred wards
  skills: text("skills"), // JSON array of nursing skills
  languages: text("languages"),
  certifications: text("certifications"),
  bio: text("bio"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  isVerified: boolean("is_verified").default(false),
  approvalStatus: text("approval_status").default("pending"),
});

// Pharmacists
export const pharmacists = pgTable("pharmacists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  pharmacyDegree: text("pharmacy_degree").notNull(), // BPharm, MPharm, PharmD, etc.
  licenseNumber: text("license_number").notNull(),
  specialization: text("specialization"), // Clinical Pharmacy, Oncology, Pediatrics, etc.
  experience: integer("experience"),
  shiftType: text("shift_type").default("day"), // day, night, rotation
  workingHours: text("working_hours"),
  pharmacyType: text("pharmacy_type").default("hospital"), // hospital, retail, clinical
  languages: text("languages"),
  certifications: text("certifications"), // Additional certifications
  bio: text("bio"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  isVerified: boolean("is_verified").default(false),
  approvalStatus: text("approval_status").default("pending"),
});

// Radiology Technicians
export const radiologyTechnicians = pgTable("radiology_technicians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  radiologyDegree: text("radiology_degree").notNull(), // B.Sc Radiology, Diploma, etc.
  licenseNumber: text("license_number").notNull(),
  specialization: text("specialization"), // X-Ray, CT, MRI, Ultrasound, etc.
  experience: integer("experience"),
  shiftType: text("shift_type").default("day"), // day, night, rotation
  workingHours: text("working_hours"),
  modalities: text("modalities"), // JSON array of imaging modalities
  languages: text("languages"),
  certifications: text("certifications"),
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
  tokenNumber: integer("token_number"), // Real token assigned after check-in
  tempTokenNumber: integer("temp_token_number"), // Temporary token assigned on confirmation (before check-in)
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

// Appointment Reschedule Requests - For patient-initiated reschedule requests
export const appointmentReschedules = pgTable("appointment_reschedules", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").references(() => appointments.id).notNull(),
  requestedByRole: text("requested_by_role").notNull(), // PATIENT, RECEPTIONIST, HOSPITAL
  requestedByUserId: integer("requested_by_user_id").references(() => users.id).notNull(),
  oldDate: timestamp("old_date"), // Original appointment date
  oldTimeSlot: text("old_time_slot"), // Original time slot
  newDate: timestamp("new_date"), // Requested new date
  newTimeSlot: text("new_time_slot"), // Requested new time slot
  status: text("status").default("requested").notNull(), // requested, approved, rejected, applied
  reasonCategory: text("reason_category"), // patient_requested, doctor_unavailable, clinic_timing_change, overbooked, other
  reasonNote: text("reason_note"), // Free text reason
  reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id), // Receptionist who reviewed
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"), // If rejected, why
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => {
  return {
    appointmentUnique: unique().on(table.appointmentId), // One active request per appointment
  };
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

// Insurance Providers - master list (can be global or hospital-specific)
export const insuranceProviders = pgTable("insurance_providers", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  name: text("name").notNull(),
  type: text("type"), // insurer, tpa, government_scheme, other
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient Insurance Policies - per-patient, optionally scoped to hospital
export const patientInsurancePolicies = pgTable("patient_insurance_policies", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  insuranceProviderId: integer("insurance_provider_id").references(() => insuranceProviders.id).notNull(),
  policyNumber: text("policy_number").notNull(),
  policyType: text("policy_type"), // cashless, reimbursement, corporate, other
  coverageType: text("coverage_type"), // ipd, opd, both
  sumInsured: decimal("sum_insured", { precision: 12, scale: 2 }),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insurance Pre-Authorizations - tied to IPD encounters
export const insurancePreauths = pgTable("insurance_preauths", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  insurancePolicyId: integer("insurance_policy_id").references(() => patientInsurancePolicies.id),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  status: text("status").default("pending"), // pending, approved, rejected, cancelled
  referenceNumber: text("reference_number"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Insurance Claims - linked to encounters (and invoices in future)
export const insuranceClaims = pgTable("insurance_claims", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  insurancePolicyId: integer("insurance_policy_id").references(() => patientInsurancePolicies.id),
  claimNumber: text("claim_number"),
  submittedAmount: decimal("submitted_amount", { precision: 12, scale: 2 }),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  status: text("status").default("draft"), // draft, submitted, in_review, approved, rejected, paid
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Lab Reports - Final reports (linked to orders)
export const labReports = pgTable("lab_reports", {
  id: serial("id").primaryKey(),
  labOrderId: integer("lab_order_id").references(() => labOrders.id), // Link to order
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  labId: integer("lab_id").references(() => labs.id).notNull(),
  testName: text("test_name").notNull(),
  testType: text("test_type").notNull(),
  results: text("results").notNull(), // JSON string with all results
  normalRanges: text("normal_ranges"),
  reportDate: timestamp("report_date").notNull(),
  reportUrl: text("report_url"), // Mock URL for now
  status: text("status").default("pending"), // pending, completed, released
  releasedByUserId: integer("released_by_user_id").references(() => users.id),
  releasedAt: timestamp("released_at"),
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
  nurse: one(nurses, { fields: [users.id], references: [nurses.userId] }),
  pharmacist: one(pharmacists, { fields: [users.id], references: [pharmacists.userId] }),
  radiologyTechnician: one(radiologyTechnicians, { fields: [users.id], references: [radiologyTechnicians.userId] }),
  notifications: many(notifications),
}));

export const hospitalsRelations = relations(hospitals, ({ one, many }) => ({
  user: one(users, { fields: [hospitals.userId], references: [users.id] }),
  doctors: many(doctors),
  receptionists: many(receptionists),
  nurses: many(nurses),
  pharmacists: many(pharmacists),
  radiologyTechnicians: many(radiologyTechnicians),
  appointments: many(appointments),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [doctors.hospitalId], references: [hospitals.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  labReports: many(labReports),
}));

export const nursesRelations = relations(nurses, ({ one }) => ({
  user: one(users, { fields: [nurses.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [nurses.hospitalId], references: [hospitals.id] }),
}));

export const pharmacistsRelations = relations(pharmacists, ({ one }) => ({
  user: one(users, { fields: [pharmacists.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [pharmacists.hospitalId], references: [hospitals.id] }),
}));

export const radiologyTechniciansRelations = relations(radiologyTechnicians, ({ one }) => ({
  user: one(users, { fields: [radiologyTechnicians.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [radiologyTechnicians.hospitalId], references: [hospitals.id] }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  labReports: many(labReports),
  insurancePolicies: many(patientInsurancePolicies),
}));

export const labsRelations = relations(labs, ({ one, many }) => ({
  user: one(users, { fields: [labs.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [labs.hospitalId], references: [hospitals.id] }),
  labReports: many(labReports),
}));

export const insuranceProvidersRelations = relations(insuranceProviders, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [insuranceProviders.hospitalId], references: [hospitals.id] }),
  policies: many(patientInsurancePolicies),
}));

export const patientInsurancePoliciesRelations = relations(
  patientInsurancePolicies,
  ({ one, many }) => ({
    patient: one(patients, { fields: [patientInsurancePolicies.patientId], references: [patients.id] }),
    hospital: one(hospitals, { fields: [patientInsurancePolicies.hospitalId], references: [hospitals.id] }),
    provider: one(insuranceProviders, {
      fields: [patientInsurancePolicies.insuranceProviderId],
      references: [insuranceProviders.id],
    }),
    preauths: many(insurancePreauths),
    claims: many(insuranceClaims),
  }),
);

export const insurancePreauthsRelations = relations(insurancePreauths, ({ one }) => ({
  encounter: one(ipdEncounters, { fields: [insurancePreauths.encounterId], references: [ipdEncounters.id] }),
  hospital: one(hospitals, { fields: [insurancePreauths.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [insurancePreauths.patientId], references: [patients.id] }),
  policy: one(patientInsurancePolicies, {
    fields: [insurancePreauths.insurancePolicyId],
    references: [patientInsurancePolicies.id],
  }),
}));

export const insuranceClaimsRelations = relations(insuranceClaims, ({ one }) => ({
  encounter: one(ipdEncounters, { fields: [insuranceClaims.encounterId], references: [ipdEncounters.id] }),
  hospital: one(hospitals, { fields: [insuranceClaims.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [insuranceClaims.patientId], references: [patients.id] }),
  policy: one(patientInsurancePolicies, {
    fields: [insuranceClaims.insurancePolicyId],
    references: [patientInsurancePolicies.id],
  }),
}));

export const receptionistsRelations = relations(receptionists, ({ one }) => ({
  user: one(users, { fields: [receptionists.userId], references: [users.id] }),
  hospital: one(hospitals, { fields: [receptionists.hospitalId], references: [hospitals.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  hospital: one(hospitals, { fields: [appointments.hospitalId], references: [hospitals.id] }),
  receptionist: one(receptionists, { fields: [appointments.receptionistId], references: [receptionists.id] }),
  prescription: one(prescriptions, { fields: [appointments.id], references: [prescriptions.appointmentId] }),
  rescheduleRequests: many(appointmentReschedules),
}));

export const appointmentReschedulesRelations = relations(appointmentReschedules, ({ one }) => ({
  appointment: one(appointments, { fields: [appointmentReschedules.appointmentId], references: [appointments.id] }),
  requestedBy: one(users, { fields: [appointmentReschedules.requestedByUserId], references: [users.id] }),
  reviewedBy: one(users, { fields: [appointmentReschedules.reviewedByUserId], references: [users.id] }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  appointment: one(appointments, { fields: [prescriptions.appointmentId], references: [appointments.id] }),
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [prescriptions.doctorId], references: [doctors.id] }),
}));

export const labReportsRelations = relations(labReports, ({ one }) => ({
  labOrder: one(labOrders, { fields: [labReports.labOrderId], references: [labOrders.id] }),
  patient: one(patients, { fields: [labReports.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [labReports.doctorId], references: [doctors.id] }),
  lab: one(labs, { fields: [labReports.labId], references: [labs.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Doctor Availability Rules (weekly recurring schedule)
export const doctorAvailabilityRules = pgTable("doctor_availability_rules", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: text("start_time").notNull(), // HH:mm format (e.g., "09:00")
  endTime: text("end_time").notNull(), // HH:mm format (e.g., "17:00")
  slotDurationMinutes: integer("slot_duration_minutes").default(30),
  maxPatientsPerSlot: integer("max_patients_per_slot").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Doctor Availability Exceptions (leave, overrides, blocked dates)
export const doctorAvailabilityExceptions = pgTable("doctor_availability_exceptions", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format (IST)
  type: text("type").notNull(), // leave, override_hours, blocked
  startTime: text("start_time"), // HH:mm format (nullable for full-day leave)
  endTime: text("end_time"), // HH:mm format (nullable for full-day leave)
  reason: text("reason"),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

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
  assignedNurseId: integer("assigned_nurse_id").references(() => nurses.id), // Primary assigned nurse
  assignedAt: timestamp("assigned_at"),
  assignedByUserId: integer("assigned_by_user_id").references(() => users.id), // User who assigned
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

// Patient Audit Logs - Track all patient-related actions for compliance
export const patientAuditLogs = pgTable("patient_audit_logs", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id).notNull(),
  actorRole: varchar("actor_role", { length: 50 }).notNull(),
  action: text("action").notNull(), // admit, transfer, discharge, update, etc.
  entityType: text("entity_type").notNull(), // ipd_encounter, appointment, prescription, etc.
  entityId: integer("entity_id"),
  before: text("before"), // JSON string of state before action
  after: text("after"), // JSON string of state after action
  message: text("message"), // Human readable description
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// General Audit Logs - Track all high-risk actions across the system (not only patient-centric)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  patientId: integer("patient_id").references(() => patients.id),
  actorUserId: integer("actor_user_id").references(() => users.id).notNull(),
  actorRole: varchar("actor_role", { length: 50 }).notNull(),
  action: text("action").notNull(), // e.g. APPOINTMENT_CONFIRMED, PAYMENT_RECORDED, BED_CREATED
  entityType: text("entity_type").notNull(), // appointment, invoice, bed, room, etc.
  entityId: integer("entity_id"),
  before: text("before"), // JSON string of relevant state before action
  after: text("after"), // JSON string of relevant state after action
  summary: text("summary"), // Human readable description
  reason: text("reason"), // Business reason (e.g. cancellation, override)
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clinical Notes - SOAP notes, admission notes, progress notes
export const clinicalNotes = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id), // For IPD encounters
  appointmentId: integer("appointment_id").references(() => appointments.id), // For OPD appointments
  noteType: text("note_type").notNull(), // admission, progress, discharge, consultation
  chiefComplaint: text("chief_complaint"),
  historyOfPresentIllness: text("history_of_present_illness"),
  // SOAP format
  subjective: text("subjective"), // Patient complaints, symptoms
  objective: text("objective"), // Physical exam findings, vitals summary
  assessment: text("assessment"), // Diagnosis, condition assessment
  plan: text("plan"), // Treatment plan, orders, follow-up
  // Additional fields
  admissionDiagnosis: text("admission_diagnosis"),
  physicalExamination: text("physical_examination"),
  reviewOfSystems: text("review_of_systems"),
  allergies: text("allergies"),
  medications: text("medications"), // Current medications
  pastMedicalHistory: text("past_medical_history"),
  familyHistory: text("family_history"),
  socialHistory: text("social_history"),
  // Metadata
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  signedByUserId: integer("signed_by_user_id").references(() => users.id), // Doctor who signed
  signedAt: timestamp("signed_at"),
  isDraft: boolean("is_draft").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Vitals Chart - Patient vital signs tracking
export const vitalsChart = pgTable("vitals_chart", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id), // For IPD encounters
  appointmentId: integer("appointment_id").references(() => appointments.id), // For OPD appointments
  // Vital signs
  temperature: decimal("temperature", { precision: 4, scale: 2 }), // Celsius
  temperatureUnit: text("temperature_unit").default("C"), // C or F
  bpSystolic: integer("bp_systolic"), // Blood pressure systolic
  bpDiastolic: integer("bp_diastolic"), // Blood pressure diastolic
  pulse: integer("pulse"), // Heart rate per minute
  respirationRate: integer("respiration_rate"), // Breaths per minute
  spo2: integer("spo2"), // Oxygen saturation percentage
  painScale: integer("pain_scale"), // 0-10 pain scale
  weight: decimal("weight", { precision: 5, scale: 2 }), // kg
  height: decimal("height", { precision: 5, scale: 2 }), // cm
  bmi: decimal("bmi", { precision: 4, scale: 2 }), // Body Mass Index
  bloodGlucose: decimal("blood_glucose", { precision: 5, scale: 2 }), // mg/dL
  // Additional vitals
  gcs: integer("gcs"), // Glasgow Coma Scale (3-15)
  urineOutput: decimal("urine_output", { precision: 6, scale: 2 }), // ml
  // Metadata
  recordedByUserId: integer("recorded_by_user_id").references(() => users.id).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  notes: text("notes"), // Additional notes about vitals
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nursing Notes - Nursing assessments, care plans, shift handover
export const nursingNotes = pgTable("nursing_notes", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  noteType: text("note_type").notNull(), // assessment, care_plan, shift_handover, general
  // Assessment fields
  nursingAssessment: text("nursing_assessment"),
  carePlan: text("care_plan"), // Care plan documentation
  interventions: text("interventions"), // Nursing interventions performed
  evaluation: text("evaluation"), // Evaluation of care effectiveness
  // Shift handover
  shiftType: text("shift_type"), // morning, afternoon, night
  handoverNotes: text("handover_notes"), // Shift handover information
  criticalInformation: text("critical_information"), // Critical patient information
  outstandingTasks: text("outstanding_tasks"), // Tasks for next shift
  // General notes
  notes: text("notes"), // General nursing notes
  // Metadata
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Diagnosis Codes - ICD-10 codes for diagnosis coding
export const diagnosisCodes = pgTable("diagnosis_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(), // ICD-10 code (e.g., "I10", "E11.9")
  description: text("description").notNull(), // Full description
  category: text("category"), // Category (e.g., "Diseases of the circulatory system")
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Medication Orders - Doctor orders for IPD patients
export const medicationOrders = pgTable("medication_orders", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  orderedByDoctorId: integer("ordered_by_doctor_id").references(() => doctors.id).notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  unit: text("unit").notNull(),
  route: text("route").notNull(), // oral, IV, IM, SC, topical, etc.
  frequency: text("frequency").notNull(), // QID, TID, BID, Q8H, Q12H, QD, PRN, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isPrn: boolean("is_prn").default(false),
  prnIndication: text("prn_indication"), // For PRN medications
  status: text("status").default("active").notNull(), // active, stopped, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Medication Administrations - eMAR records
export const medicationAdministrations = pgTable("medication_administrations", {
  id: serial("id").primaryKey(),
  medicationOrderId: integer("medication_order_id").references(() => medicationOrders.id).notNull(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  administeredAt: timestamp("administered_at"),
  administeredByUserId: integer("administered_by_user_id").references(() => users.id),
  status: text("status").default("scheduled").notNull(), // scheduled, given, missed, held, refused
  doseGiven: text("dose_given"), // Actual dose given
  routeUsed: text("route_used"), // Route used
  notes: text("notes"),
  reason: text("reason"), // For held/refused/missed
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// IV Fluid Orders - Doctor orders for IV fluids
export const ivFluidOrders = pgTable("iv_fluid_orders", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  orderedByDoctorId: integer("ordered_by_doctor_id").references(() => doctors.id).notNull(),
  fluidName: text("fluid_name").notNull(), // e.g., Normal Saline, Ringer's Lactate
  volume: text("volume").notNull(), // e.g., 500ml, 1000ml
  rate: text("rate").notNull(), // e.g., 100ml/hr, 50 drops/min
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").default("active").notNull(), // active, stopped, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Diet Orders - Doctor orders for patient diet
export const dietOrders = pgTable("diet_orders", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  orderedByDoctorId: integer("ordered_by_doctor_id").references(() => doctors.id).notNull(),
  dietType: text("diet_type").notNull(), // e.g., Normal, Soft, Liquid, Diabetic, Cardiac, Renal
  specialInstructions: text("special_instructions"), // Additional dietary requirements
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").default("active").notNull(), // active, stopped, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Nursing Orders - Doctor orders for nursing care
export const nursingOrders = pgTable("nursing_orders", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  orderedByDoctorId: integer("ordered_by_doctor_id").references(() => doctors.id).notNull(),
  orderType: text("order_type").notNull(), // e.g., vitals_monitoring, wound_care, positioning, isolation
  orderDescription: text("order_description").notNull(),
  frequency: text("frequency"), // e.g., Q4H, Q8H, QID, TID, BID, QD
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: text("status").default("active").notNull(), // active, stopped, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Nurse Activity Logs - Comprehensive activity tracking
export const nurseActivityLogs = pgTable("nurse_activity_logs", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  nurseId: integer("nurse_id").references(() => nurses.id).notNull(),
  activityType: text("activity_type").notNull(), // vitals, medication, note, assessment, etc.
  activitySubtype: text("activity_subtype"), // medication_given, vitals_recorded, etc.
  entityType: text("entity_type"), // vitals_chart, medication_administration, etc.
  entityId: integer("entity_id"), // ID of related entity
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string for additional details
  createdAt: timestamp("created_at").defaultNow(),
});

// Nurse Assignments - Assignment history (supports multiple nurses per patient)
export const nurseAssignments = pgTable("nurse_assignments", {
  id: serial("id").primaryKey(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  nurseId: integer("nurse_id").references(() => nurses.id).notNull(),
  assignedByUserId: integer("assigned_by_user_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  unassignedAt: timestamp("unassigned_at"), // null if currently assigned
  unassignedByUserId: integer("unassigned_by_user_id").references(() => users.id),
  reason: text("reason"), // Assignment or unassignment reason
  shiftType: text("shift_type"), // day, night, rotation
  createdAt: timestamp("created_at").defaultNow(),
});

// OPD Billing - Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id), // 1 invoice per appointment in v1
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(), // Unique per hospital
  status: text("status").default("draft").notNull(), // draft, issued, paid, partially_paid, refunded, void
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  discountType: text("discount_type"), // amount, percent
  discountReason: text("discount_reason"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR"),
  issuedAt: timestamp("issued_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  type: text("type").notNull(), // consultation_fee, registration_fee
  description: text("description").notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  method: text("method").notNull(), // cash, card, upi, online
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 255 }), // UPI txn id, card last 4 digits, etc.
  receivedByUserId: integer("received_by_user_id").references(() => users.id).notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Refunds
export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  processedByUserId: integer("processed_by_user_id").references(() => users.id).notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Medicine Catalog - Master list of medicines available in the system
export const medicineCatalog = pgTable("medicine_catalog", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  genericName: text("generic_name"),
  brandName: text("brand_name"),
  category: text("category").notNull(), // tablet, injection, syrup, capsule, ointment, etc.
  type: text("type").notNull(), // medicine, injection, vaccine, etc.
  dosageForm: text("dosage_form"), // tablet, capsule, injection, syrup, etc.
  strength: text("strength"), // 500mg, 10ml, etc.
  unit: text("unit"), // mg, ml, tablet, etc.
  manufacturer: text("manufacturer"),
  description: text("description"),
  indications: text("indications"), // What it's used for
  contraindications: text("contraindications"),
  sideEffects: text("side_effects"),
  storageConditions: text("storage_conditions"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Lab Test Catalog - Master list of lab tests available
export const labTestCatalog = pgTable("lab_test_catalog", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").unique(), // Test code like CBC, LFT, etc.
  category: text("category").notNull(), // Blood Test, Urine Test, Stool Test, etc.
  subCategory: text("sub_category"), // Hematology, Biochemistry, Microbiology, etc.
  description: text("description"),
  preparationInstructions: text("preparation_instructions"), // Fasting required, etc.
  sampleType: text("sample_type"), // Blood, Urine, Stool, Sputum, etc.
  normalRange: text("normal_range"), // Normal values
  turnaroundTime: text("turnaround_time"), // Hours or days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Radiology/Imaging Test Catalog - Master list of imaging tests
export const radiologyTestCatalog = pgTable("radiology_test_catalog", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").unique(), // Test code like XRAY, CT, MRI, etc.
  category: text("category").notNull(), // X-Ray, CT Scan, MRI, Ultrasound, etc.
  subCategory: text("sub_category"), // Chest X-Ray, Abdominal CT, etc.
  description: text("description"),
  preparationInstructions: text("preparation_instructions"), // Fasting, contrast, etc.
  bodyPart: text("body_part"), // Chest, Abdomen, Head, etc.
  contrastRequired: boolean("contrast_required").default(false),
  radiationDose: text("radiation_dose"), // For X-Ray/CT
  turnaroundTime: text("turnaround_time"), // Hours or days
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
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

// Clinical Documentation Relations
export const clinicalNotesRelations = relations(clinicalNotes, ({ one }) => ({
  hospital: one(hospitals, { fields: [clinicalNotes.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [clinicalNotes.patientId], references: [patients.id] }),
  encounter: one(ipdEncounters, { fields: [clinicalNotes.encounterId], references: [ipdEncounters.id] }),
  appointment: one(appointments, { fields: [clinicalNotes.appointmentId], references: [appointments.id] }),
  createdBy: one(users, { fields: [clinicalNotes.createdByUserId], references: [users.id] }),
  signedBy: one(users, { fields: [clinicalNotes.signedByUserId], references: [users.id] }),
}));

export const vitalsChartRelations = relations(vitalsChart, ({ one }) => ({
  hospital: one(hospitals, { fields: [vitalsChart.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [vitalsChart.patientId], references: [patients.id] }),
  encounter: one(ipdEncounters, { fields: [vitalsChart.encounterId], references: [ipdEncounters.id] }),
  appointment: one(appointments, { fields: [vitalsChart.appointmentId], references: [appointments.id] }),
  recordedBy: one(users, { fields: [vitalsChart.recordedByUserId], references: [users.id] }),
}));

export const nursingNotesRelations = relations(nursingNotes, ({ one }) => ({
  hospital: one(hospitals, { fields: [nursingNotes.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [nursingNotes.patientId], references: [patients.id] }),
  encounter: one(ipdEncounters, { fields: [nursingNotes.encounterId], references: [ipdEncounters.id] }),
  createdBy: one(users, { fields: [nursingNotes.createdByUserId], references: [users.id] }),
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
  role: z.enum(['hospital', 'doctor', 'patient', 'lab', 'nurse', 'pharmacist', 'radiology_technician']),
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

export const insertNurseSchema = createInsertSchema(nurses).omit({
  id: true,
  createdAt: true,
});

export const insertPharmacistSchema = createInsertSchema(pharmacists).omit({
  id: true,
  createdAt: true,
});

export const insertRadiologyTechnicianSchema = createInsertSchema(radiologyTechnicians).omit({
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

export type InsertNurse = InferInsertModel<typeof nurses>;
export type Nurse = InferSelectModel<typeof nurses>;

export type InsertPharmacist = InferInsertModel<typeof pharmacists>;
export type Pharmacist = InferSelectModel<typeof pharmacists>;

export type InsertRadiologyTechnician = InferInsertModel<typeof radiologyTechnicians>;
export type RadiologyTechnician = InferSelectModel<typeof radiologyTechnicians>;

export type InsertPatient = InferInsertModel<typeof patients>;
export type Patient = InferSelectModel<typeof patients>;

export type InsertInsuranceProvider = InferInsertModel<typeof insuranceProviders>;
export type InsuranceProvider = InferSelectModel<typeof insuranceProviders>;

export type InsertPatientInsurancePolicy = InferInsertModel<typeof patientInsurancePolicies>;
export type PatientInsurancePolicy = InferSelectModel<typeof patientInsurancePolicies>;

export type InsertInsurancePreauth = InferInsertModel<typeof insurancePreauths>;
export type InsurancePreauth = InferSelectModel<typeof insurancePreauths>;

export type InsertInsuranceClaim = InferInsertModel<typeof insuranceClaims>;
export type InsuranceClaim = InferSelectModel<typeof insuranceClaims>;

export type InsertLab = InferInsertModel<typeof labs>;
export type Lab = InferSelectModel<typeof labs>;

export type InsertReceptionist = InferInsertModel<typeof receptionists>;
export type Receptionist = InferSelectModel<typeof receptionists>;

export type InsertAppointment = InferInsertModel<typeof appointments>;
export type Appointment = InferSelectModel<typeof appointments>;

export type InsertAppointmentReschedule = InferInsertModel<typeof appointmentReschedules>;
export type AppointmentReschedule = InferSelectModel<typeof appointmentReschedules>;

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

export type InsertClinicalNote = InferInsertModel<typeof clinicalNotes>;
export type ClinicalNote = InferSelectModel<typeof clinicalNotes>;

export type InsertVitalsChart = InferInsertModel<typeof vitalsChart>;
export type VitalsChart = InferSelectModel<typeof vitalsChart>;

export type InsertNursingNote = InferInsertModel<typeof nursingNotes>;
export type NursingNote = InferSelectModel<typeof nursingNotes>;

export type InsertMedicationOrder = InferInsertModel<typeof medicationOrders>;
export type MedicationOrder = InferSelectModel<typeof medicationOrders>;

export type InsertMedicationAdministration = InferInsertModel<typeof medicationAdministrations>;
export type MedicationAdministration = InferSelectModel<typeof medicationAdministrations>;

export type InsertNurseActivityLog = InferInsertModel<typeof nurseActivityLogs>;
export type NurseActivityLog = InferSelectModel<typeof nurseActivityLogs>;

export type InsertNurseAssignment = InferInsertModel<typeof nurseAssignments>;
export type NurseAssignment = InferSelectModel<typeof nurseAssignments>;

export type InsertMedicationOrder = InferInsertModel<typeof medicationOrders>;
export type MedicationOrder = InferSelectModel<typeof medicationOrders>;

export type InsertMedicationAdministration = InferInsertModel<typeof medicationAdministrations>;
export type MedicationAdministration = InferSelectModel<typeof medicationAdministrations>;

export type InsertNurseActivityLog = InferInsertModel<typeof nurseActivityLogs>;
export type NurseActivityLog = InferSelectModel<typeof nurseActivityLogs>;

export type InsertNurseAssignment = InferInsertModel<typeof nurseAssignments>;
export type NurseAssignment = InferSelectModel<typeof nurseAssignments>;

export type InsertMedicineCatalog = InferInsertModel<typeof medicineCatalog>;
export type MedicineCatalog = InferSelectModel<typeof medicineCatalog>;

export type InsertLabTestCatalog = InferInsertModel<typeof labTestCatalog>;
export type LabTestCatalog = InferSelectModel<typeof labTestCatalog>;

export type InsertRadiologyTestCatalog = InferInsertModel<typeof radiologyTestCatalog>;
export type RadiologyTestCatalog = InferSelectModel<typeof radiologyTestCatalog>;

export type InsertDiagnosisCode = InferInsertModel<typeof diagnosisCodes>;
export type DiagnosisCode = InferSelectModel<typeof diagnosisCodes>;

// ============================================
// PHARMACY INVENTORY MANAGEMENT
// ============================================

// Suppliers - Supplier master data
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Pharmacy Inventory - Stock management
export const pharmacyInventory = pgTable("pharmacy_inventory", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  medicineCatalogId: integer("medicine_catalog_id").references(() => medicineCatalog.id).notNull(),
  batchNumber: text("batch_number").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  quantity: integer("quantity").notNull().default(0), // Current stock quantity
  unit: text("unit").notNull(), // tablet, ml, vial, etc.
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  mrp: decimal("mrp", { precision: 10, scale: 2 }), // Maximum Retail Price
  location: text("location"), // Storage location/rack
  reorderLevel: integer("reorder_level").default(10), // Alert when stock falls below this
  minStockLevel: integer("min_stock_level").default(5), // Critical stock level
  maxStockLevel: integer("max_stock_level"), // Maximum stock to maintain
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Pharmacy Stock Movements - In/Out transactions
export const pharmacyStockMovements = pgTable("pharmacy_stock_movements", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  inventoryId: integer("inventory_id").references(() => pharmacyInventory.id).notNull(),
  movementType: text("movement_type").notNull(), // purchase, sale, return, adjustment, transfer, expiry, damage
  quantity: integer("quantity").notNull(), // Positive for in, negative for out
  unit: text("unit").notNull(),
  referenceType: text("reference_type"), // purchase_order, dispensation, adjustment, etc.
  referenceId: integer("reference_id"), // ID of the reference (PO, dispensation, etc.)
  reason: text("reason"), // Reason for movement
  performedByUserId: integer("performed_by_user_id").references(() => users.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase Orders - PO management
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  poNumber: text("po_number").notNull().unique(), // Purchase order number
  orderDate: timestamp("order_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  status: text("status").default("pending").notNull(), // pending, approved, ordered, received, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  receivedByUserId: integer("received_by_user_id").references(() => users.id),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Purchase Order Items - Items in a PO
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  medicineCatalogId: integer("medicine_catalog_id").references(() => medicineCatalog.id).notNull(),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").default(0), // Quantity received
  createdAt: timestamp("created_at").defaultNow(),
});

// Dispensations - Medicine dispensing records
export const dispensations = pgTable("dispensations", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id), // For IPD
  appointmentId: integer("appointment_id").references(() => appointments.id), // For OPD
  dispensationType: text("dispensation_type").notNull(), // opd, ipd
  status: text("status").default("pending").notNull(), // pending, dispensed, partial, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  dispensedByUserId: integer("dispensed_by_user_id").references(() => users.id),
  dispensedAt: timestamp("dispensed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Dispensation Items - Individual medicines dispensed
export const dispensationItems = pgTable("dispensation_items", {
  id: serial("id").primaryKey(),
  dispensationId: integer("dispensation_id").references(() => dispensations.id).notNull(),
  prescriptionItemId: integer("prescription_item_id"), // Optional - prescriptions store items as JSON
  inventoryId: integer("inventory_id").references(() => pharmacyInventory.id).notNull(),
  medicineName: text("medicine_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for pharmacy
export type InsertSupplier = InferInsertModel<typeof suppliers>;
export type Supplier = InferSelectModel<typeof suppliers>;

export type InsertPharmacyInventory = InferInsertModel<typeof pharmacyInventory>;
export type PharmacyInventory = InferSelectModel<typeof pharmacyInventory>;

export type InsertPharmacyStockMovement = InferInsertModel<typeof pharmacyStockMovements>;
export type PharmacyStockMovement = InferSelectModel<typeof pharmacyStockMovements>;

export type InsertPurchaseOrder = InferInsertModel<typeof purchaseOrders>;
export type PurchaseOrder = InferSelectModel<typeof purchaseOrders>;

export type InsertPurchaseOrderItem = InferInsertModel<typeof purchaseOrderItems>;
export type PurchaseOrderItem = InferSelectModel<typeof purchaseOrderItems>;

export type InsertDispensation = InferInsertModel<typeof dispensations>;
export type Dispensation = InferSelectModel<typeof dispensations>;

export type InsertDispensationItem = InferInsertModel<typeof dispensationItems>;
export type DispensationItem = InferSelectModel<typeof dispensationItems>;

// ============================================
// LAB (LIS) WORKFLOW MANAGEMENT
// ============================================

// Lab Orders - Orders placed by doctors for lab tests
export const labOrders = pgTable("lab_orders", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id), // For IPD
  orderNumber: text("order_number").notNull().unique(), // Lab order number
  orderDate: timestamp("order_date").defaultNow().notNull(),
  priority: text("priority").default("routine"), // routine, urgent, stat
  status: text("status").default("ordered").notNull(), // ordered, sample_collected, processing, completed, cancelled
  clinicalNotes: text("clinical_notes"), // Doctor's clinical notes
  orderedByUserId: integer("ordered_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Lab Order Items - Individual tests in an order
export const labOrderItems = pgTable("lab_order_items", {
  id: serial("id").primaryKey(),
  labOrderId: integer("lab_order_id").references(() => labOrders.id).notNull(),
  labTestCatalogId: integer("lab_test_catalog_id").references(() => labTestCatalog.id).notNull(),
  testName: text("test_name").notNull(),
  status: text("status").default("ordered").notNull(), // ordered, sample_collected, processing, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lab Samples - Sample collection tracking
export const labSamples = pgTable("lab_samples", {
  id: serial("id").primaryKey(),
  labOrderItemId: integer("lab_order_item_id").references(() => labOrderItems.id).notNull(),
  labOrderId: integer("lab_order_id").references(() => labOrders.id).notNull(),
  sampleNumber: text("sample_number").notNull().unique(), // Sample barcode/number
  sampleType: text("sample_type").notNull(), // Blood, Urine, Stool, etc.
  collectionDate: timestamp("collection_date"),
  collectionTime: timestamp("collection_time"),
  collectedByUserId: integer("collected_by_user_id").references(() => users.id),
  status: text("status").default("pending").notNull(), // pending, collected, received, processing, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lab Results - Individual test results (before final report)
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
  labOrderItemId: integer("lab_order_item_id").references(() => labOrderItems.id).notNull(),
  labSampleId: integer("lab_sample_id").references(() => labSamples.id),
  testName: text("test_name").notNull(),
  parameterName: text("parameter_name"), // For tests with multiple parameters (e.g., CBC has WBC, RBC, etc.)
  resultValue: text("result_value"), // The actual result
  unit: text("unit"), // Unit of measurement
  normalRange: text("normal_range"), // Normal range for this parameter
  isAbnormal: boolean("is_abnormal").default(false), // Flag if result is abnormal
  enteredByUserId: integer("entered_by_user_id").references(() => users.id).notNull(),
  validatedByUserId: integer("validated_by_user_id").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  status: text("status").default("pending").notNull(), // pending, entered, validated, released
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Update labReports to link to orders
// Note: labReports table already exists, we'll add order reference via migration if needed

// Type exports for lab workflow
export type InsertLabOrder = InferInsertModel<typeof labOrders>;
export type LabOrder = InferSelectModel<typeof labOrders>;

export type InsertLabOrderItem = InferInsertModel<typeof labOrderItems>;
export type LabOrderItem = InferSelectModel<typeof labOrderItems>;

export type InsertLabSample = InferInsertModel<typeof labSamples>;
export type LabSample = InferSelectModel<typeof labSamples>;

export type InsertLabResult = InferInsertModel<typeof labResults>;
export type LabResult = InferSelectModel<typeof labResults>;

// ============================================
// RADIOLOGY (RIS) WORKFLOW MANAGEMENT
// ============================================

// Radiology Orders - Orders placed by doctors for imaging tests
export const radiologyOrders = pgTable("radiology_orders", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id),
  encounterId: integer("encounter_id").references(() => ipdEncounters.id), // For IPD
  orderNumber: text("order_number").notNull().unique(), // Radiology order number
  orderDate: timestamp("order_date").defaultNow().notNull(),
  priority: text("priority").default("routine"), // routine, urgent, stat
  status: text("status").default("ordered").notNull(), // ordered, scheduled, in_progress, completed, cancelled
  clinicalIndication: text("clinical_indication"), // Doctor's clinical indication
  orderedByUserId: integer("ordered_by_user_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at"), // When the imaging is scheduled
  performedByUserId: integer("performed_by_user_id").references(() => users.id), // Radiology technician
  performedAt: timestamp("performed_at"), // When imaging was performed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Radiology Order Items - Individual tests in an order
export const radiologyOrderItems = pgTable("radiology_order_items", {
  id: serial("id").primaryKey(),
  radiologyOrderId: integer("radiology_order_id").references(() => radiologyOrders.id).notNull(),
  radiologyTestCatalogId: integer("radiology_test_catalog_id").references(() => radiologyTestCatalog.id).notNull(),
  testName: text("test_name").notNull(),
  status: text("status").default("ordered").notNull(), // ordered, scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Radiology Reports - Final reports (similar to lab reports)
export const radiologyReports = pgTable("radiology_reports", {
  id: serial("id").primaryKey(),
  radiologyOrderId: integer("radiology_order_id").references(() => radiologyOrders.id), // Link to order
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  radiologyTechnicianId: integer("radiology_technician_id").references(() => radiologyTechnicians.id),
  testName: text("test_name").notNull(),
  testType: text("test_type").notNull(), // X-Ray, CT, MRI, Ultrasound, etc.
  findings: text("findings").notNull(), // Radiologist's findings
  impression: text("impression"), // Radiologist's impression/conclusion
  reportDate: timestamp("report_date").notNull(),
  reportUrl: text("report_url"), // Mock URL for now (PACS integration later)
  imageUrls: text("image_urls"), // JSON array of image URLs (mock for now)
  status: text("status").default("pending"), // pending, completed, released
  reportedByUserId: integer("reported_by_user_id").references(() => users.id), // Radiologist
  reportedAt: timestamp("reported_at"),
  releasedByUserId: integer("released_by_user_id").references(() => users.id),
  releasedAt: timestamp("released_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for radiology workflow
export type InsertRadiologyOrder = InferInsertModel<typeof radiologyOrders>;
export type RadiologyOrder = InferSelectModel<typeof radiologyOrders>;

export type InsertRadiologyOrderItem = InferInsertModel<typeof radiologyOrderItems>;
export type RadiologyOrderItem = InferSelectModel<typeof radiologyOrderItems>;

export type InsertRadiologyReport = InferInsertModel<typeof radiologyReports>;
export type RadiologyReport = InferSelectModel<typeof radiologyReports>;

// Type exports for hospital charges
export type InsertHospitalCharge = InferInsertModel<typeof hospitalCharges>;
export type HospitalCharge = InferSelectModel<typeof hospitalCharges>;

export type InsertBedTypePricing = InferInsertModel<typeof bedTypePricing>;
export type BedTypePricing = InferSelectModel<typeof bedTypePricing>;

// Lab Orders Relations
export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [labOrders.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [labOrders.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [labOrders.doctorId], references: [doctors.id] }),
  appointment: one(appointments, { fields: [labOrders.appointmentId], references: [appointments.id] }),
  encounter: one(ipdEncounters, { fields: [labOrders.encounterId], references: [ipdEncounters.id] }),
  items: many(labOrderItems),
  reports: many(labReports),
}));

// Lab Order Items Relations
export const labOrderItemsRelations = relations(labOrderItems, ({ one, many }) => ({
  labOrder: one(labOrders, { fields: [labOrderItems.labOrderId], references: [labOrders.id] }),
  labTest: one(labTestCatalog, { fields: [labOrderItems.labTestCatalogId], references: [labTestCatalog.id] }),
  samples: many(labSamples),
  results: many(labResults),
}));

// Lab Samples Relations
export const labSamplesRelations = relations(labSamples, ({ one, many }) => ({
  labOrderItem: one(labOrderItems, { fields: [labSamples.labOrderItemId], references: [labOrderItems.id] }),
  labOrder: one(labOrders, { fields: [labSamples.labOrderId], references: [labOrders.id] }),
  results: many(labResults),
}));

// Lab Results Relations
export const labResultsRelations = relations(labResults, ({ one }) => ({
  labOrderItem: one(labOrderItems, { fields: [labResults.labOrderItemId], references: [labOrderItems.id] }),
  labSample: one(labSamples, { fields: [labResults.labSampleId], references: [labSamples.id] }),
}));

// Radiology Orders Relations
export const radiologyOrdersRelations = relations(radiologyOrders, ({ one, many }) => ({
  hospital: one(hospitals, { fields: [radiologyOrders.hospitalId], references: [hospitals.id] }),
  patient: one(patients, { fields: [radiologyOrders.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [radiologyOrders.doctorId], references: [doctors.id] }),
  appointment: one(appointments, { fields: [radiologyOrders.appointmentId], references: [appointments.id] }),
  encounter: one(ipdEncounters, { fields: [radiologyOrders.encounterId], references: [ipdEncounters.id] }),
  items: many(radiologyOrderItems),
  reports: many(radiologyReports),
}));

// Radiology Order Items Relations
export const radiologyOrderItemsRelations = relations(radiologyOrderItems, ({ one }) => ({
  radiologyOrder: one(radiologyOrders, { fields: [radiologyOrderItems.radiologyOrderId], references: [radiologyOrders.id] }),
  radiologyTest: one(radiologyTestCatalog, { fields: [radiologyOrderItems.radiologyTestCatalogId], references: [radiologyTestCatalog.id] }),
}));

// Radiology Reports Relations
export const radiologyReportsRelations = relations(radiologyReports, ({ one }) => ({
  radiologyOrder: one(radiologyOrders, { fields: [radiologyReports.radiologyOrderId], references: [radiologyOrders.id] }),
  patient: one(patients, { fields: [radiologyReports.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [radiologyReports.doctorId], references: [doctors.id] }),
  radiologyTechnician: one(radiologyTechnicians, { fields: [radiologyReports.radiologyTechnicianId], references: [radiologyTechnicians.id] }),
}));

// Hospital Charges Catalog - Master pricing for all services
export const hospitalCharges = pgTable("hospital_charges", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  chargeType: text("charge_type").notNull(), // bed, lab, radiology, pharmacy, procedure, consultation, nursing, ot, emergency, admission, discharge, misc
  chargeCategory: text("charge_category"), // For bed: general, semi_private, private, deluxe, vip, icu, ccu, etc. For lab: pathology, biochemistry, etc.
  chargeSubCategory: text("charge_sub_category"), // More specific categorization
  itemName: text("item_name").notNull(), // Name of the charge item
  itemCode: text("item_code"), // Hospital's internal code for this charge
  description: text("description"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // Base price
  unit: text("unit").notNull(), // per_day, per_test, per_procedure, per_consultation, per_item, etc.
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"), // For price changes over time
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Bed Type Pricing - Specific pricing for bed types per hospital
export const bedTypePricing = pgTable("bed_type_pricing", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").references(() => hospitals.id).notNull(),
  bedType: text("bed_type").notNull(), // general, semi_private, private, deluxe, vip, icu, ccu, nicu, picu, etc.
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }).notNull(),
  halfDayRate: decimal("half_day_rate", { precision: 10, scale: 2 }), // For partial day charges
  amenities: text("amenities"), // JSON array of included amenities
  description: text("description"),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Relations for charges
export const hospitalChargesRelations = relations(hospitalCharges, ({ one }) => ({
  hospital: one(hospitals, { fields: [hospitalCharges.hospitalId], references: [hospitals.id] }),
}));

export const bedTypePricingRelations = relations(bedTypePricing, ({ one }) => ({
  hospital: one(hospitals, { fields: [bedTypePricing.hospitalId], references: [hospitals.id] }),
}));
