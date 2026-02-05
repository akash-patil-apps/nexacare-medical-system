// shared/schema-types.ts
import { InferInsertModel } from "drizzle-orm";
import { appointments, users, receptionists, doctors, hospitals, otpVerifications, notifications, labs, labReports, patients, prescriptions, messages } from "./schema";

export type InsertUser = InferInsertModel<typeof users>;
export type InsertAppointment = InferInsertModel<typeof appointments>;
export type InsertReceptionist = InferInsertModel<typeof receptionists>;
export type InsertDoctor = InferInsertModel<typeof doctors>;
export type InsertHospital = InferInsertModel<typeof hospitals>;
export type InsertOtp = InferInsertModel<typeof otpVerifications>;
export type InsertNotification = InferInsertModel<typeof notifications>;
export type InsertLab = InferInsertModel<typeof labs>;
export type InsertLabReport = InferInsertModel<typeof labReports>;
export type InsertPatient = InferInsertModel<typeof patients>;
export type InsertPrescription = InferInsertModel<typeof prescriptions>;
export type InsertMessage = InferInsertModel<typeof messages>;








