import { pgTable, foreignKey, serial, integer, text, numeric, boolean, timestamp, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const doctors = pgTable("doctors", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	hospitalId: integer("hospital_id"),
	specialty: text().notNull(),
	licenseNumber: text("license_number").notNull(),
	qualification: text().notNull(),
	experience: integer(),
	consultationFee: numeric("consultation_fee", { precision: 10, scale:  2 }),
	workingHours: text("working_hours"),
	availableSlots: text("available_slots"),
	status: text().default('in'),
	languages: text(),
	awards: text(),
	bio: text(),
	isAvailable: boolean("is_available").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "doctors_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.hospitalId],
			foreignColumns: [hospitals.id],
			name: "doctors_hospital_id_hospitals_id_fk"
		}),
]);

export const hospitals = pgTable("hospitals", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	name: text().notNull(),
	address: text().notNull(),
	city: text().notNull(),
	state: text().notNull(),
	zipCode: text("zip_code").notNull(),
	licenseNumber: text("license_number").notNull(),
	contactEmail: text("contact_email"),
	website: text(),
	establishedYear: integer("established_year"),
	totalBeds: integer("total_beds"),
	departments: text(),
	services: text(),
	operatingHours: text("operating_hours"),
	emergencyServices: boolean("emergency_services").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "hospitals_user_id_users_id_fk"
		}),
]);

export const labReports = pgTable("lab_reports", {
	id: serial().primaryKey().notNull(),
	patientId: integer("patient_id").notNull(),
	doctorId: integer("doctor_id"),
	labId: integer("lab_id").notNull(),
	testName: text("test_name").notNull(),
	testType: text("test_type").notNull(),
	results: text().notNull(),
	normalRanges: text("normal_ranges"),
	reportDate: timestamp("report_date", { mode: 'string' }).notNull(),
	reportUrl: text("report_url"),
	status: text().default('pending'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "lab_reports_patient_id_patients_id_fk"
		}),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "lab_reports_doctor_id_doctors_id_fk"
		}),
	foreignKey({
			columns: [table.labId],
			foreignColumns: [labs.id],
			name: "lab_reports_lab_id_labs_id_fk"
		}),
]);

export const labs = pgTable("labs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	hospitalId: integer("hospital_id"),
	name: text().notNull(),
	address: text().notNull(),
	city: text().notNull(),
	state: text().notNull(),
	zipCode: text("zip_code").notNull(),
	licenseNumber: text("license_number").notNull(),
	contactEmail: text("contact_email"),
	operatingHours: text("operating_hours"),
	specializations: text(),
	testCategories: text("test_categories"),
	equipment: text(),
	accreditation: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "labs_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.hospitalId],
			foreignColumns: [hospitals.id],
			name: "labs_hospital_id_hospitals_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	relatedId: integer("related_id"),
	relatedType: text("related_type"),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}),
]);

export const otpVerifications = pgTable("otp_verifications", {
	id: serial().primaryKey().notNull(),
	mobileNumber: text("mobile_number").notNull(),
	otp: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isUsed: boolean("is_used").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const patients = pgTable("patients", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	gender: text(),
	bloodGroup: text("blood_group"),
	height: numeric({ precision: 5, scale:  2 }),
	weight: numeric({ precision: 5, scale:  2 }),
	address: text(),
	city: text(),
	state: text(),
	zipCode: text("zip_code"),
	emergencyContact: text("emergency_contact"),
	emergencyContactName: text("emergency_contact_name"),
	emergencyRelation: text("emergency_relation"),
	medicalHistory: text("medical_history"),
	allergies: text(),
	currentMedications: text("current_medications"),
	chronicConditions: text("chronic_conditions"),
	insuranceProvider: text("insurance_provider"),
	insuranceNumber: text("insurance_number"),
	occupation: text(),
	maritalStatus: text("marital_status"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "patients_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	mobileNumber: text("mobile_number").notNull(),
	password: text().notNull(),
	fullName: text("full_name").notNull(),
	role: text().notNull(),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_mobile_number_unique").on(table.mobileNumber),
]);

export const prescriptions = pgTable("prescriptions", {
	id: serial().primaryKey().notNull(),
	appointmentId: integer("appointment_id"),
	patientId: integer("patient_id").notNull(),
	doctorId: integer("doctor_id").notNull(),
	diagnosis: text().notNull(),
	medications: text().notNull(),
	instructions: text(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.appointmentId],
			foreignColumns: [appointments.id],
			name: "prescriptions_appointment_id_appointments_id_fk"
		}),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "prescriptions_patient_id_patients_id_fk"
		}),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "prescriptions_doctor_id_doctors_id_fk"
		}),
]);

export const appointments = pgTable("appointments", {
	id: serial().primaryKey().notNull(),
	patientId: integer("patient_id").notNull(),
	doctorId: integer("doctor_id").notNull(),
	hospitalId: integer("hospital_id").notNull(),
	receptionistId: integer("receptionist_id"),
	appointmentDate: timestamp("appointment_date", { mode: 'string' }).notNull(),
	appointmentTime: text("appointment_time").notNull(),
	timeSlot: text("time_slot").notNull(),
	reason: text().notNull(),
	status: text().default('pending'),
	type: text().default('online'),
	priority: text().default('normal'),
	symptoms: text(),
	notes: text(),
	tokenNumber: integer("token_number"),
	checkedInAt: timestamp("checked_in_at", { mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	rescheduledAt: timestamp("rescheduled_at", { mode: 'string' }),
	rescheduledFromDate: timestamp("rescheduled_from_date", { mode: 'string' }),
	rescheduledFromTimeSlot: text("rescheduled_from_time_slot"),
	rescheduleReason: text("reschedule_reason"),
	rescheduledBy: integer("rescheduled_by"),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "appointments_patient_id_patients_id_fk"
		}),
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "appointments_doctor_id_doctors_id_fk"
		}),
	foreignKey({
			columns: [table.hospitalId],
			foreignColumns: [hospitals.id],
			name: "appointments_hospital_id_hospitals_id_fk"
		}),
	foreignKey({
			columns: [table.receptionistId],
			foreignColumns: [receptionists.id],
			name: "appointments_receptionist_id_receptionists_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "appointments_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.rescheduledBy],
			foreignColumns: [users.id],
			name: "appointments_rescheduled_by_users_id_fk"
		}),
]);

export const receptionists = pgTable("receptionists", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	hospitalId: integer("hospital_id").notNull(),
	employeeId: text("employee_id"),
	department: text(),
	shift: text(),
	workingHours: text("working_hours"),
	permissions: text(),
	dateOfJoining: timestamp("date_of_joining", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "receptionists_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.hospitalId],
			foreignColumns: [hospitals.id],
			name: "receptionists_hospital_id_hospitals_id_fk"
		}),
]);
