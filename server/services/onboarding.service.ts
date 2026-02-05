// server/services/onboarding.service.ts
import { db } from "../db";
import { patients, users, hospitals, states, nurses, pharmacists, radiologyTechnicians } from "../../shared/schema";
import { eq, ilike } from "drizzle-orm";

/**
 * Complete patient onboarding by creating/updating patient profile.
 */
export const completePatientOnboarding = async (userId: number, data: any) => {
  console.log(`🎯 Completing patient onboarding for user ${userId}`);
  console.log(`📥 Received data:`, {
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    hasDateOfBirth: !!data.dateOfBirth,
    hasGender: !!data.gender,
  });
  
  try {
    // Check if patient profile already exists
    const existingPatient = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    
    // Prepare patient data - ensure dateOfBirth is properly formatted
    let dateOfBirthValue = null;
    if (data.dateOfBirth) {
      try {
        const date = new Date(data.dateOfBirth);
        if (!isNaN(date.getTime())) {
          dateOfBirthValue = date;
        } else {
          console.warn(`⚠️ Invalid date format: ${data.dateOfBirth}`);
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing date: ${data.dateOfBirth}`, e);
      }
    }
    
    const patientData = {
      dateOfBirth: dateOfBirthValue,
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
      governmentIdType: data.governmentIdType || null,
      governmentIdNumber: data.governmentIdNumber ? String(data.governmentIdNumber).trim() : null,
    };
    
    console.log(`💾 Saving patient data:`, {
      dateOfBirth: patientData.dateOfBirth,
      gender: patientData.gender,
      hasDateOfBirth: !!patientData.dateOfBirth,
      hasGender: !!patientData.gender,
    });

    if (existingPatient.length > 0) {
      // Update existing patient profile
      console.log(`📝 Updating existing patient profile for user ${userId}`);
      const result = await db
        .update(patients)
        .set(patientData)
        .where(eq(patients.userId, userId))
        .returning();
      
      console.log(`✅ Patient profile updated for user ${userId}`);
      console.log(`📊 Saved profile:`, {
        dateOfBirth: result[0].dateOfBirth,
        gender: result[0].gender,
        hasDateOfBirth: !!result[0].dateOfBirth,
        hasGender: !!result[0].gender,
      });
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
      console.log(`📊 Saved profile:`, {
        dateOfBirth: result[0].dateOfBirth,
        gender: result[0].gender,
        hasDateOfBirth: !!result[0].dateOfBirth,
        hasGender: !!result[0].gender,
      });
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
    
    // Check if profile is complete (has required essential fields)
    // Required fields: dateOfBirth and gender (as per onboarding form)
    let isComplete = false;
    
    if (hasPatientProfile && patient[0]) {
      const profile = patient[0];
      const hasDateOfBirth = profile.dateOfBirth !== null && profile.dateOfBirth !== undefined;
      const hasGender = profile.gender !== null && profile.gender !== undefined && profile.gender !== '';
      
      console.log(`📊 Profile check for user ${userId}:`, {
        hasProfile: true,
        dateOfBirth: profile.dateOfBirth,
        hasDateOfBirth,
        gender: profile.gender,
        hasGender,
      });
      
      isComplete = hasDateOfBirth && hasGender;
    } else {
      console.log(`📊 Profile check for user ${userId}: No profile found`);
    }
    
    console.log(`📊 Onboarding status for user ${userId}: ${isComplete ? 'Complete' : 'Incomplete'}`);
    
    return {
      userId,
      hasProfile: hasPatientProfile,
      isCompleted: isComplete, // Use isCompleted for consistency with frontend
      isComplete, // Keep for backward compatibility
      profile: patient[0] || null,
      user: {
        id: user[0].id,
        fullName: user[0].fullName,
        email: user[0].email,
        mobileNumber: user[0].mobileNumber,
        role: user[0].role,
      }
    };
  } catch (error) {
    console.error(`❌ Failed to get onboarding status for user ${userId}:`, error);
    throw error;
  }
};

const normaliseListField = (value: unknown) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  return null;
};

const formatOperatingHours = (start?: string | null, end?: string | null) => {
  if (!start || !end) return null;
  const toDisplay = (time: string) => {
    const [hourStr, minuteStr = "00"] = time.split(":");
    let hours = Number(hourStr);
    if (Number.isNaN(hours)) return time;
    const minutes = minuteStr.slice(0, 2);
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  };

  return `${toDisplay(start)} - ${toDisplay(end)}`;
};

const resolveStateName = async (stateId?: number | null, stateName?: string | null) => {
  if (stateId) {
    const [stateRecord] = await db
      .select()
      .from(states)
      .where(eq(states.id, stateId))
      .limit(1);

    if (!stateRecord) {
      throw new Error("Invalid state selection");
    }
    return stateRecord.name;
  }

  if (stateName && stateName.trim() !== "") {
    const [stateRecord] = await db
      .select()
      .from(states)
      .where(ilike(states.name, stateName.trim()))
      .limit(1);

    if (stateRecord) {
      return stateRecord.name;
    }

    throw new Error("Invalid state selection");
  }

  throw new Error("State is required");
};

export const completeHospitalOnboarding = async (userId: number, data: any) => {
  console.log(`🏥 Completing hospital onboarding for user ${userId}`);

  try {
    const stateName = await resolveStateName(
      data.stateId ? Number(data.stateId) : undefined,
      data.state
    );

    const hospitalData = {
      name: data.hospitalName,
      address: data.address,
      city: data.city,
      state: stateName,
      zipCode: data.zipCode,
      licenseNumber: data.licenseNumber,
      establishedYear: data.establishedYear ? Number(data.establishedYear) : null,
      totalBeds: data.totalBeds ? Number(data.totalBeds) : null,
      departments: normaliseListField(data.departments),
      services: normaliseListField(data.services),
      operatingHours: formatOperatingHours(data.operatingHoursStart, data.operatingHoursEnd),
      emergencyServices: Boolean(data.emergencyServices),
      contactEmail: data.contactEmail || null,
      website: data.website || null,
      photos: Array.isArray(data.photos) && data.photos.length > 0
        ? JSON.stringify(data.photos)
        : null,
    };

    if (!hospitalData.name || !hospitalData.address || !hospitalData.city || !hospitalData.zipCode || !hospitalData.licenseNumber) {
      throw new Error("Missing required hospital fields");
    }

    const existingHospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);

    if (existingHospital.length > 0) {
      console.log(`📝 Updating existing hospital profile for user ${userId}`);
      const [updated] = await db
        .update(hospitals)
        .set(hospitalData)
        .where(eq(hospitals.userId, userId))
        .returning();

      console.log(`✅ Hospital profile updated for user ${userId}`);
      return { success: true, hospital: updated, isNew: false };
    }

    console.log(`🆕 Creating new hospital profile for user ${userId}`);
    const [created] = await db
      .insert(hospitals)
      .values({
        userId,
        ...hospitalData,
        createdAt: new Date(),
      })
      .returning();

    console.log(`✅ Hospital profile created for user ${userId}`);
    return { success: true, hospital: created, isNew: true };
  } catch (error) {
    console.error(`❌ Hospital onboarding failed for user ${userId}:`, error);
    throw error;
  }
};

export const getHospitalOnboardingStatus = async (userId: number) => {
  console.log(`🔍 Checking hospital onboarding status for user ${userId}`);

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, userId))
      .limit(1);

    const hasProfile = !!hospital;
    const isComplete =
      !!hospital &&
      !!hospital.name &&
      !!hospital.address &&
      !!hospital.city &&
      !!hospital.state &&
      !!hospital.zipCode &&
      !!hospital.licenseNumber;

    return {
      userId,
      hasProfile,
      isCompleted: isComplete,
      profile: hospital || null,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    };
  } catch (error) {
    console.error(`❌ Failed to get hospital onboarding status for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Complete nurse onboarding by creating/updating nurse profile.
 */
export const completeNurseOnboarding = async (userId: number, data: any) => {
  console.log(`👩‍⚕️ Completing nurse onboarding for user ${userId}`);
  console.log(`📥 Received data:`, {
    nursingDegree: data.nursingDegree,
    licenseNumber: data.licenseNumber,
    specialization: data.specialization,
    experience: data.experience,
  });

  try {
    // Get user's hospital association (nurses must be associated with a hospital)
    // For now, we'll need to get this from the frontend or set it during registration
    // In a real implementation, nurses would be invited by hospitals
    const hospitalId = data.hospitalId || 1; // Default to first hospital for demo

    // Check if nurse profile already exists
    const existingNurse = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, userId))
      .limit(1);

    const nurseData = {
      nursingDegree: data.nursingDegree,
      licenseNumber: data.licenseNumber,
      specialization: data.specialization,
      experience: data.experience,
      shiftType: data.shiftType || 'day',
      workingHours: data.workingHours,
      wardPreferences: data.wardPreferences ? JSON.stringify(data.wardPreferences) : null,
      skills: data.skills ? JSON.stringify(data.skills) : null,
      languages: data.languages,
      certifications: data.certifications,
      bio: data.bio,
      hospitalId,
    };

    console.log(`💾 Saving nurse data:`, nurseData);

    if (existingNurse.length > 0) {
      // Update existing nurse profile
      console.log(`📝 Updating existing nurse profile for user ${userId}`);
      const result = await db
        .update(nurses)
        .set(nurseData)
        .where(eq(nurses.userId, userId))
        .returning();

      console.log(`✅ Nurse profile updated for user ${userId}`);
      return { success: true, nurse: result[0], isNew: false };
    } else {
      // Create new nurse profile
      console.log(`🆕 Creating new nurse profile for user ${userId}`);
      const result = await db
        .insert(nurses)
        .values({
          userId,
          ...nurseData,
          createdAt: new Date(),
        })
        .returning();

      console.log(`✅ Nurse profile created for user ${userId}`);
      return { success: true, nurse: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Nurse onboarding error for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get nurse onboarding status.
 */
export const getNurseOnboardingStatus = async (userId: number) => {
  console.log(`👩‍⚕️ Checking nurse onboarding status for user ${userId}`);

  try {
    // Check if nurse profile exists
    const nurseProfile = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, userId))
      .limit(1);

    if (nurseProfile.length > 0) {
      console.log(`✅ Nurse onboarding completed for user ${userId}`);
      return { isCompleted: true, nurse: nurseProfile[0] };
    }

    console.log(`⏳ Nurse onboarding not completed for user ${userId}`);
    return { isCompleted: false };
  } catch (error) {
    console.error(`❌ Error checking nurse onboarding status for user ${userId}:`, error);
    return { isCompleted: false };
  }
};

/**
 * Complete pharmacist onboarding by creating/updating pharmacist profile.
 */
export const completePharmacistOnboarding = async (userId: number, data: any) => {
  console.log(`💊 Completing pharmacist onboarding for user ${userId}`);
  console.log(`📥 Received data:`, {
    pharmacyDegree: data.pharmacyDegree,
    licenseNumber: data.licenseNumber,
    specialization: data.specialization,
    experience: data.experience,
  });

  try {
    // Get user's hospital association
    const hospitalId = data.hospitalId || 1; // Default to first hospital for demo

    // Check if pharmacist profile already exists
    const existingPharmacist = await db
      .select()
      .from(pharmacists)
      .where(eq(pharmacists.userId, userId))
      .limit(1);

    const pharmacistData = {
      pharmacyDegree: data.pharmacyDegree,
      licenseNumber: data.licenseNumber,
      specialization: data.specialization,
      experience: data.experience,
      shiftType: data.shiftType || 'day',
      workingHours: data.workingHours,
      pharmacyType: data.pharmacyType || 'hospital',
      languages: data.languages,
      certifications: data.certifications,
      bio: data.bio,
      hospitalId,
    };

    console.log(`💾 Saving pharmacist data:`, pharmacistData);

    if (existingPharmacist.length > 0) {
      // Update existing pharmacist profile
      console.log(`📝 Updating existing pharmacist profile for user ${userId}`);
      const result = await db
        .update(pharmacists)
        .set(pharmacistData)
        .where(eq(pharmacists.userId, userId))
        .returning();

      console.log(`✅ Pharmacist profile updated for user ${userId}`);
      return { success: true, pharmacist: result[0], isNew: false };
    } else {
      // Create new pharmacist profile
      console.log(`🆕 Creating new pharmacist profile for user ${userId}`);
      const result = await db
        .insert(pharmacists)
        .values({
          userId,
          ...pharmacistData,
          createdAt: new Date(),
        })
        .returning();

      console.log(`✅ Pharmacist profile created for user ${userId}`);
      return { success: true, pharmacist: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Pharmacist onboarding error for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get pharmacist onboarding status.
 */
export const getPharmacistOnboardingStatus = async (userId: number) => {
  console.log(`💊 Checking pharmacist onboarding status for user ${userId}`);

  try {
    // Check if pharmacist profile exists
    const pharmacistProfile = await db
      .select()
      .from(pharmacists)
      .where(eq(pharmacists.userId, userId))
      .limit(1);

    if (pharmacistProfile.length > 0) {
      console.log(`✅ Pharmacist onboarding completed for user ${userId}`);
      return { isCompleted: true, pharmacist: pharmacistProfile[0] };
    }

    console.log(`⏳ Pharmacist onboarding not completed for user ${userId}`);
    return { isCompleted: false };
  } catch (error) {
    console.error(`❌ Error checking pharmacist onboarding status for user ${userId}:`, error);
    return { isCompleted: false };
  }
};

/**
 * Complete radiology technician onboarding by creating/updating radiology technician profile.
 */
export const completeRadiologyTechnicianOnboarding = async (userId: number, data: any) => {
  console.log(`🩻 Completing radiology technician onboarding for user ${userId}`);
  console.log(`📥 Received data:`, {
    radiologyDegree: data.radiologyDegree,
    licenseNumber: data.licenseNumber,
    specialization: data.specialization,
    experience: data.experience,
  });

  try {
    // Get user's hospital association
    const hospitalId = data.hospitalId || 1; // Default to first hospital for demo

    // Check if radiology technician profile already exists
    const existingTechnician = await db
      .select()
      .from(radiologyTechnicians)
      .where(eq(radiologyTechnicians.userId, userId))
      .limit(1);

    const technicianData = {
      radiologyDegree: data.radiologyDegree,
      licenseNumber: data.licenseNumber,
      specialization: data.specialization,
      experience: data.experience,
      shiftType: data.shiftType || 'day',
      workingHours: data.workingHours,
      modalities: data.modalities,
      languages: data.languages,
      certifications: data.certifications,
      bio: data.bio,
      hospitalId,
    };

    console.log(`💾 Saving radiology technician data:`, technicianData);

    if (existingTechnician.length > 0) {
      // Update existing radiology technician profile
      console.log(`📝 Updating existing radiology technician profile for user ${userId}`);
      const result = await db
        .update(radiologyTechnicians)
        .set(technicianData)
        .where(eq(radiologyTechnicians.userId, userId))
        .returning();

      console.log(`✅ Radiology technician profile updated for user ${userId}`);
      return { success: true, technician: result[0], isNew: false };
    } else {
      // Create new radiology technician profile
      console.log(`🆕 Creating new radiology technician profile for user ${userId}`);
      const result = await db
        .insert(radiologyTechnicians)
        .values({
          userId,
          ...technicianData,
          createdAt: new Date(),
        })
        .returning();

      console.log(`✅ Radiology technician profile created for user ${userId}`);
      return { success: true, technician: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Radiology technician onboarding error for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get radiology technician onboarding status.
 */
export const getRadiologyTechnicianOnboardingStatus = async (userId: number) => {
  console.log(`🩻 Checking radiology technician onboarding status for user ${userId}`);

  try {
    // Check if radiology technician profile exists
    const technicianProfile = await db
      .select()
      .from(radiologyTechnicians)
      .where(eq(radiologyTechnicians.userId, userId))
      .limit(1);

    if (technicianProfile.length > 0) {
      console.log(`✅ Radiology technician onboarding completed for user ${userId}`);
      return { isCompleted: true, technician: technicianProfile[0] };
    }

    console.log(`⏳ Radiology technician onboarding not completed for user ${userId}`);
    return { isCompleted: false };
  } catch (error) {
    console.error(`❌ Error checking radiology technician onboarding status for user ${userId}:`, error);
    return { isCompleted: false };
  }
};

/**
 * Complete doctor onboarding by creating/updating doctor profile.
 */
export const completeDoctorOnboarding = async (userId: number, data: any) => {
  console.log(`🎯 Completing doctor onboarding for user ${userId}`);
  
  try {
    const { doctors } = await import("../../shared/schema");
    const existingDoctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    const doctorData = {
      hospitalId: data.hospitalId || null,
      specialty: data.specialty || null,
      qualification: data.qualification || null,
      licenseNumber: data.licenseNumber || null,
      experience: data.experience ? Number(data.experience) : null,
      consultationFee: data.consultationFee ? String(data.consultationFee) : null,
      workingHours: data.workingHours || null,
      languages: data.languages || null,
      awards: data.awards || null,
      bio: data.bio || null,
    };

    if (existingDoctor.length > 0) {
      const result = await db
        .update(doctors)
        .set(doctorData)
        .where(eq(doctors.userId, userId))
        .returning();
      return { success: true, doctor: result[0], isNew: false };
    } else {
      const result = await db
        .insert(doctors)
        .values({
          userId,
          ...doctorData,
          createdAt: new Date(),
        })
        .returning();
      return { success: true, doctor: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Doctor onboarding failed for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get doctor onboarding status.
 */
export const getDoctorOnboardingStatus = async (userId: number) => {
  try {
    const { doctors } = await import("../../shared/schema");
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);

    const hasProfile = doctor.length > 0;
    const isComplete = hasProfile && doctor[0]?.specialty && doctor[0]?.licenseNumber;

    return {
      userId,
      hasProfile,
      isCompleted: isComplete,
      isComplete,
      profile: doctor[0] || null,
    };
  } catch (error) {
    console.error(`❌ Error checking doctor onboarding status:`, error);
    return { isCompleted: false };
  }
};

/**
 * Complete receptionist onboarding by creating/updating receptionist profile.
 */
export const completeReceptionistOnboarding = async (userId: number, data: any) => {
  console.log(`🎯 Completing receptionist onboarding for user ${userId}`);
  
  try {
    const { receptionists } = await import("../../shared/schema");
    const existingReceptionist = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, userId))
      .limit(1);

    const receptionistData = {
      hospitalId: data.hospitalId || null,
      employeeId: data.employeeId || null,
      department: data.department || null,
      shift: data.shift || null,
      workingHours: data.workingHours || null,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
    };

    if (existingReceptionist.length > 0) {
      const result = await db
        .update(receptionists)
        .set(receptionistData)
        .where(eq(receptionists.userId, userId))
        .returning();
      return { success: true, receptionist: result[0], isNew: false };
    } else {
      const result = await db
        .insert(receptionists)
        .values({
          userId,
          ...receptionistData,
          createdAt: new Date(),
        })
        .returning();
      return { success: true, receptionist: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Receptionist onboarding failed for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get receptionist onboarding status.
 */
export const getReceptionistOnboardingStatus = async (userId: number) => {
  try {
    const { receptionists } = await import("../../shared/schema");
    const receptionist = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, userId))
      .limit(1);

    const hasProfile = receptionist.length > 0;
    const isComplete = hasProfile && receptionist[0]?.hospitalId;

    return {
      userId,
      hasProfile,
      isCompleted: isComplete,
      isComplete,
      profile: receptionist[0] || null,
    };
  } catch (error) {
    console.error(`❌ Error checking receptionist onboarding status:`, error);
    return { isCompleted: false };
  }
};

/**
 * Complete lab onboarding by creating/updating lab profile.
 */
export const completeLabOnboarding = async (userId: number, data: any) => {
  console.log(`🎯 Completing lab onboarding for user ${userId}`);
  
  try {
    const { labs } = await import("../../shared/schema");
    const existingLab = await db
      .select()
      .from(labs)
      .where(eq(labs.userId, userId))
      .limit(1);

    const labData = {
      name: data.name || null,
      licenseNumber: data.licenseNumber || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      contactEmail: data.contactEmail || null,
      operatingHours: data.operatingHours || null,
      specializations: data.specializations ? (Array.isArray(data.specializations) ? data.specializations.join(', ') : data.specializations) : null,
      testCategories: data.testCategories ? (Array.isArray(data.testCategories) ? data.testCategories.join(', ') : data.testCategories) : null,
      equipment: data.equipment ? (Array.isArray(data.equipment) ? data.equipment.join(', ') : data.equipment) : null,
      accreditation: data.accreditation || null,
    };

    if (existingLab.length > 0) {
      const result = await db
        .update(labs)
        .set(labData)
        .where(eq(labs.userId, userId))
        .returning();
      return { success: true, lab: result[0], isNew: false };
    } else {
      const result = await db
        .insert(labs)
        .values({
          userId,
          ...labData,
          createdAt: new Date(),
        })
        .returning();
      return { success: true, lab: result[0], isNew: true };
    }
  } catch (error) {
    console.error(`❌ Lab onboarding failed for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get lab onboarding status.
 */
export const getLabOnboardingStatus = async (userId: number) => {
  try {
    const { labs } = await import("../../shared/schema");
    const lab = await db
      .select()
      .from(labs)
      .where(eq(labs.userId, userId))
      .limit(1);

    const hasProfile = lab.length > 0;
    const isComplete = hasProfile && lab[0]?.name && lab[0]?.licenseNumber;

    return {
      userId,
      hasProfile,
      isCompleted: isComplete,
      isComplete,
      profile: lab[0] || null,
    };
  } catch (error) {
    console.error(`❌ Error checking lab onboarding status:`, error);
    return { isCompleted: false };
  }
};






