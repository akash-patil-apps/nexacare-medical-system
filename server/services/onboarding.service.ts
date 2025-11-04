// server/services/onboarding.service.ts
import { db } from "../db";
import { patients, users } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Complete patient onboarding by creating/updating patient profile.
 */
export const completePatientOnboarding = async (userId: number, data: any) => {
  console.log(`🎯 Completing patient onboarding for user ${userId}`);
  
  try {
    // Check if patient profile already exists
    const existingPatient = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    
    // Prepare patient data
    const patientData = {
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      bloodGroup: data.bloodGroup || null,
      height: data.height ? String(data.height) : null,
      weight: data.weight ? String(data.weight) : null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      emergencyContact: data.emergencyContact || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyRelation: data.emergencyRelation || null,
      medicalHistory: data.medicalHistory || null,
      allergies: data.allergies || null,
      currentMedications: data.currentMedications || null,
      chronicConditions: data.chronicConditions || null,
      insuranceProvider: data.insuranceProvider || null,
      insuranceNumber: data.insuranceNumber || null,
      occupation: data.occupation || null,
      maritalStatus: data.maritalStatus || null,
    };

    if (existingPatient.length > 0) {
      // Update existing patient profile
      console.log(`📝 Updating existing patient profile for user ${userId}`);
      const result = await db
        .update(patients)
        .set(patientData)
        .where(eq(patients.userId, userId))
        .returning();
      
      console.log(`✅ Patient profile updated for user ${userId}`);
      return { success: true, patient: result[0], isNew: false };
    } else {
      // Create new patient profile
      console.log(`🆕 Creating new patient profile for user ${userId}`);
      const result = await db
        .insert(patients)
        .values({
          userId,
          ...patientData,
          createdAt: new Date(),
        })
        .returning();
      
      console.log(`✅ Patient profile created for user ${userId}`);
      return { success: true, patient: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Patient onboarding failed for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get patient onboarding status.
 */
export const getPatientOnboardingStatus = async (userId: number) => {
  console.log(`🔍 Checking onboarding status for user ${userId}`);
  
  try {
    // Get user info
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (user.length === 0) {
      throw new Error("User not found");
    }

    // Get patient profile
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    
    const hasPatientProfile = patient.length > 0;
    
    // Check if profile is complete (has essential fields)
    const isComplete = hasPatientProfile && patient[0] && (
      patient[0].dateOfBirth !== null ||
      patient[0].gender !== null ||
      patient[0].bloodGroup !== null
    );
    
    console.log(`📊 Onboarding status for user ${userId}: ${isComplete ? 'Complete' : 'Incomplete'}`);
    
    return {
      userId,
      hasProfile: hasPatientProfile,
      isComplete,
      profile: patient[0] || null,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        mobile: user[0].mobile,
        role: user[0].role,
      }
    };
  } catch (error) {
    console.error(`❌ Failed to get onboarding status for user ${userId}:`, error);
    throw error;
  }
};



