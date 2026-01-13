// Seed script for medicine catalog, lab test catalog, and radiology test catalog
import { db } from '../server/db';
import { medicineCatalog, labTestCatalog, radiologyTestCatalog } from '../shared/schema';
import { sql } from 'drizzle-orm';

const MEDICINES = [
  // Common Tablets/Capsules
  { name: 'Paracetamol 500mg', genericName: 'Paracetamol', brandName: 'Crocin', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '500mg', unit: 'tablet', manufacturer: 'GSK', indications: 'Fever, Pain relief', storageConditions: 'Store at room temperature' },
  { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', brandName: 'Brufen', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '400mg', unit: 'tablet', manufacturer: 'Abbott', indications: 'Pain, Inflammation', storageConditions: 'Store at room temperature' },
  { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', brandName: 'Amoxil', category: 'tablet', type: 'medicine', dosageForm: 'capsule', strength: '500mg', unit: 'capsule', manufacturer: 'Cipla', indications: 'Bacterial infections', storageConditions: 'Store in cool, dry place' },
  { name: 'Azithromycin 500mg', genericName: 'Azithromycin', brandName: 'Azithral', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '500mg', unit: 'tablet', manufacturer: 'Sun Pharma', indications: 'Bacterial infections', storageConditions: 'Store at room temperature' },
  { name: 'Cetirizine 10mg', genericName: 'Cetirizine', brandName: 'Zyrtec', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '10mg', unit: 'tablet', manufacturer: 'UCB', indications: 'Allergies, Hay fever', storageConditions: 'Store at room temperature' },
  { name: 'Omeprazole 20mg', genericName: 'Omeprazole', brandName: 'Omez', category: 'tablet', type: 'medicine', dosageForm: 'capsule', strength: '20mg', unit: 'capsule', manufacturer: 'Dr. Reddy\'s', indications: 'Acid reflux, Ulcers', storageConditions: 'Store at room temperature' },
  { name: 'Metformin 500mg', genericName: 'Metformin', brandName: 'Glycomet', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '500mg', unit: 'tablet', manufacturer: 'USV', indications: 'Type 2 Diabetes', storageConditions: 'Store at room temperature' },
  { name: 'Amlodipine 5mg', genericName: 'Amlodipine', brandName: 'Amlodac', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '5mg', unit: 'tablet', manufacturer: 'Cadila', indications: 'High blood pressure', storageConditions: 'Store at room temperature' },
  { name: 'Atorvastatin 10mg', genericName: 'Atorvastatin', brandName: 'Atorva', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '10mg', unit: 'tablet', manufacturer: 'Lupin', indications: 'High cholesterol', storageConditions: 'Store at room temperature' },
  { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', brandName: 'Pantocid', category: 'tablet', type: 'medicine', dosageForm: 'tablet', strength: '40mg', unit: 'tablet', manufacturer: 'Sun Pharma', indications: 'Acid reflux, GERD', storageConditions: 'Store at room temperature' },
  
  // Injections
  { name: 'Diclofenac Injection 75mg/3ml', genericName: 'Diclofenac', brandName: 'Voveran', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '75mg/3ml', unit: 'ampoule', manufacturer: 'Novartis', indications: 'Pain, Inflammation', storageConditions: 'Store in refrigerator' },
  { name: 'Ceftriaxone Injection 1g', genericName: 'Ceftriaxone', brandName: 'Ceftum', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '1g', unit: 'vial', manufacturer: 'GSK', indications: 'Severe bacterial infections', storageConditions: 'Store in refrigerator' },
  { name: 'Paracetamol Injection 1g/100ml', genericName: 'Paracetamol', brandName: 'Perfalgan', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '1g/100ml', unit: 'vial', manufacturer: 'Bristol Myers', indications: 'Fever, Pain', storageConditions: 'Store at room temperature' },
  { name: 'Tramadol Injection 50mg/2ml', genericName: 'Tramadol', brandName: 'Tramazac', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '50mg/2ml', unit: 'ampoule', manufacturer: 'Zydus', indications: 'Moderate to severe pain', storageConditions: 'Store at room temperature' },
  { name: 'Ondansetron Injection 4mg/2ml', genericName: 'Ondansetron', brandName: 'Emeset', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '4mg/2ml', unit: 'ampoule', manufacturer: 'Cipla', indications: 'Nausea, Vomiting', storageConditions: 'Store at room temperature' },
  { name: 'Insulin Glargine Injection 100IU/ml', genericName: 'Insulin Glargine', brandName: 'Lantus', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '100IU/ml', unit: 'vial', manufacturer: 'Sanofi', indications: 'Diabetes', storageConditions: 'Store in refrigerator' },
  { name: 'Furosemide Injection 20mg/2ml', genericName: 'Furosemide', brandName: 'Lasix', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '20mg/2ml', unit: 'ampoule', manufacturer: 'Sanofi', indications: 'Edema, Hypertension', storageConditions: 'Store at room temperature' },
  { name: 'Dexamethasone Injection 4mg/ml', genericName: 'Dexamethasone', brandName: 'Dexona', category: 'injection', type: 'injection', dosageForm: 'injection', strength: '4mg/ml', unit: 'vial', manufacturer: 'Zydus', indications: 'Inflammation, Allergies', storageConditions: 'Store at room temperature' },
  
  // Syrups
  { name: 'Cough Syrup 100ml', genericName: 'Dextromethorphan', brandName: 'Benadryl', category: 'syrup', type: 'medicine', dosageForm: 'syrup', strength: '15mg/5ml', unit: 'ml', manufacturer: 'GSK', indications: 'Cough, Cold', storageConditions: 'Store at room temperature' },
  { name: 'Paracetamol Syrup 100ml', genericName: 'Paracetamol', brandName: 'Crocin', category: 'syrup', type: 'medicine', dosageForm: 'syrup', strength: '125mg/5ml', unit: 'ml', manufacturer: 'GSK', indications: 'Fever, Pain', storageConditions: 'Store at room temperature' },
  { name: 'Amoxicillin Syrup 100ml', genericName: 'Amoxicillin', brandName: 'Mox', category: 'syrup', type: 'medicine', dosageForm: 'syrup', strength: '250mg/5ml', unit: 'ml', manufacturer: 'Cipla', indications: 'Bacterial infections', storageConditions: 'Store in refrigerator after opening' },
];

const LAB_TESTS = [
  // Blood Tests
  { name: 'Complete Blood Count (CBC)', code: 'CBC', category: 'Blood Test', subCategory: 'Hematology', description: 'Complete blood count including RBC, WBC, Hemoglobin, Platelets', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'RBC: 4.5-5.5 million/μL, WBC: 4000-11000/μL, Hb: 12-16 g/dL', turnaroundTime: '2-4 hours' },
  { name: 'Blood Glucose (Fasting)', code: 'FBS', category: 'Blood Test', subCategory: 'Biochemistry', description: 'Fasting blood sugar level', preparationInstructions: 'Fasting for 8-12 hours required', sampleType: 'Blood', normalRange: '70-100 mg/dL', turnaroundTime: '2-4 hours' },
  { name: 'Blood Glucose (Random)', code: 'RBS', category: 'Blood Test', subCategory: 'Biochemistry', description: 'Random blood sugar level', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'Below 200 mg/dL', turnaroundTime: '2-4 hours' },
  { name: 'HbA1c (Glycated Hemoglobin)', code: 'HbA1c', category: 'Blood Test', subCategory: 'Biochemistry', description: 'Average blood sugar over 2-3 months', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'Below 5.7%', turnaroundTime: '24-48 hours' },
  { name: 'Lipid Profile', code: 'LIPID', category: 'Blood Test', subCategory: 'Biochemistry', description: 'Total cholesterol, HDL, LDL, Triglycerides', preparationInstructions: 'Fasting for 12 hours required', sampleType: 'Blood', normalRange: 'Total Chol: <200 mg/dL, HDL: >40 mg/dL, LDL: <100 mg/dL', turnaroundTime: '24 hours' },
  { name: 'Liver Function Test (LFT)', code: 'LFT', category: 'Blood Test', subCategory: 'Biochemistry', description: 'ALT, AST, Bilirubin, Albumin, Total Protein', preparationInstructions: 'Fasting for 8-12 hours recommended', sampleType: 'Blood', normalRange: 'ALT: 7-56 U/L, AST: 10-40 U/L, Bilirubin: 0.1-1.2 mg/dL', turnaroundTime: '24 hours' },
  { name: 'Kidney Function Test (KFT)', code: 'KFT', category: 'Blood Test', subCategory: 'Biochemistry', description: 'Creatinine, Urea, Uric Acid, Electrolytes', preparationInstructions: 'Fasting for 8-12 hours recommended', sampleType: 'Blood', normalRange: 'Creatinine: 0.6-1.2 mg/dL, Urea: 7-20 mg/dL', turnaroundTime: '24 hours' },
  { name: 'Thyroid Function Test (TFT)', code: 'TFT', category: 'Blood Test', subCategory: 'Biochemistry', description: 'TSH, T3, T4 levels', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'TSH: 0.4-4.0 mIU/L, T3: 80-200 ng/dL, T4: 5-12 μg/dL', turnaroundTime: '24-48 hours' },
  { name: 'Vitamin D', code: 'VITD', category: 'Blood Test', subCategory: 'Biochemistry', description: '25-Hydroxyvitamin D level', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: '30-100 ng/mL', turnaroundTime: '48-72 hours' },
  { name: 'Vitamin B12', code: 'VITB12', category: 'Blood Test', subCategory: 'Biochemistry', description: 'Vitamin B12 level', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: '200-900 pg/mL', turnaroundTime: '48-72 hours' },
  { name: 'Hemoglobin (Hb)', code: 'HB', category: 'Blood Test', subCategory: 'Hematology', description: 'Hemoglobin level', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'Male: 13.5-17.5 g/dL, Female: 12.0-15.5 g/dL', turnaroundTime: '2-4 hours' },
  { name: 'ESR (Erythrocyte Sedimentation Rate)', code: 'ESR', category: 'Blood Test', subCategory: 'Hematology', description: 'ESR level', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'Male: 0-15 mm/hr, Female: 0-20 mm/hr', turnaroundTime: '2-4 hours' },
  { name: 'Blood Group & Rh Factor', code: 'BGRH', category: 'Blood Test', subCategory: 'Immunohematology', description: 'ABO blood group and Rh factor', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'A+, A-, B+, B-, AB+, AB-, O+, O-', turnaroundTime: '2-4 hours' },
  { name: 'C-Reactive Protein (CRP)', code: 'CRP', category: 'Blood Test', subCategory: 'Immunology', description: 'Inflammation marker', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'Below 3 mg/L', turnaroundTime: '24 hours' },
  { name: 'D-Dimer', code: 'DDIMER', category: 'Blood Test', subCategory: 'Hematology', description: 'Blood clot marker', preparationInstructions: 'No fasting required', sampleType: 'Blood', normalRange: 'Below 0.5 μg/mL', turnaroundTime: '24 hours' },
  
  // Urine Tests
  { name: 'Urine Routine & Microscopy', code: 'URM', category: 'Urine Test', subCategory: 'Clinical Pathology', description: 'Physical, chemical, and microscopic examination of urine', preparationInstructions: 'Mid-stream clean catch sample', sampleType: 'Urine', normalRange: 'pH: 4.5-8.0, Specific Gravity: 1.005-1.030', turnaroundTime: '2-4 hours' },
  { name: 'Urine Culture & Sensitivity', code: 'UCS', category: 'Urine Test', subCategory: 'Microbiology', description: 'Bacterial culture and antibiotic sensitivity', preparationInstructions: 'Mid-stream clean catch sample, sterile container', sampleType: 'Urine', normalRange: 'No growth', turnaroundTime: '48-72 hours' },
  { name: '24-Hour Urine Protein', code: '24UP', category: 'Urine Test', subCategory: 'Biochemistry', description: 'Total protein in 24-hour urine collection', preparationInstructions: 'Collect all urine for 24 hours', sampleType: 'Urine', normalRange: 'Below 150 mg/24hr', turnaroundTime: '24 hours' },
  
  // Stool Tests
  { name: 'Stool Routine & Microscopy', code: 'SRM', category: 'Stool Test', subCategory: 'Clinical Pathology', description: 'Physical and microscopic examination', preparationInstructions: 'Fresh sample in sterile container', sampleType: 'Stool', normalRange: 'No parasites, no blood', turnaroundTime: '24 hours' },
  { name: 'Stool Culture & Sensitivity', code: 'SCS', category: 'Stool Test', subCategory: 'Microbiology', description: 'Bacterial culture and antibiotic sensitivity', preparationInstructions: 'Fresh sample in sterile container', sampleType: 'Stool', normalRange: 'No pathogenic bacteria', turnaroundTime: '48-72 hours' },
  { name: 'Stool Occult Blood', code: 'SOB', category: 'Stool Test', subCategory: 'Clinical Pathology', description: 'Hidden blood in stool', preparationInstructions: 'Avoid red meat 3 days before test', sampleType: 'Stool', normalRange: 'Negative', turnaroundTime: '24 hours' },
];

const RADIOLOGY_TESTS = [
  // X-Rays
  { name: 'Chest X-Ray (PA View)', code: 'CXRPA', category: 'X-Ray', subCategory: 'Chest X-Ray', description: 'Postero-anterior view of chest', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Chest', contrastRequired: false, radiationDose: '0.1 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Chest X-Ray (AP View)', code: 'CXRAP', category: 'X-Ray', subCategory: 'Chest X-Ray', description: 'Antero-posterior view of chest', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Chest', contrastRequired: false, radiationDose: '0.1 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Abdominal X-Ray', code: 'AXR', category: 'X-Ray', subCategory: 'Abdominal X-Ray', description: 'X-Ray of abdomen', preparationInstructions: 'No preparation required', bodyPart: 'Abdomen', contrastRequired: false, radiationDose: '0.7 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Skull X-Ray', code: 'SKX', category: 'X-Ray', subCategory: 'Skull X-Ray', description: 'X-Ray of skull', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Head', contrastRequired: false, radiationDose: '0.1 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Spine X-Ray (Cervical)', code: 'SPXC', category: 'X-Ray', subCategory: 'Spine X-Ray', description: 'X-Ray of cervical spine', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Neck', contrastRequired: false, radiationDose: '0.2 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Spine X-Ray (Lumbar)', code: 'SPXL', category: 'X-Ray', subCategory: 'Spine X-Ray', description: 'X-Ray of lumbar spine', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Lower Back', contrastRequired: false, radiationDose: '1.5 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Knee X-Ray', code: 'KNX', category: 'X-Ray', subCategory: 'Extremity X-Ray', description: 'X-Ray of knee joint', preparationInstructions: 'Remove metal objects', bodyPart: 'Knee', contrastRequired: false, radiationDose: '0.005 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Ankle X-Ray', code: 'ANKX', category: 'X-Ray', subCategory: 'Extremity X-Ray', description: 'X-Ray of ankle', preparationInstructions: 'Remove metal objects', bodyPart: 'Ankle', contrastRequired: false, radiationDose: '0.001 mSv', turnaroundTime: '1-2 hours' },
  
  // CT Scans
  { name: 'CT Head (Plain)', code: 'CTH', category: 'CT Scan', subCategory: 'Head CT', description: 'CT scan of head without contrast', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Head', contrastRequired: false, radiationDose: '2 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Head (With Contrast)', code: 'CTHC', category: 'CT Scan', subCategory: 'Head CT', description: 'CT scan of head with contrast', preparationInstructions: 'Fasting 4 hours, remove metal objects', bodyPart: 'Head', contrastRequired: true, radiationDose: '2 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Chest (Plain)', code: 'CTC', category: 'CT Scan', subCategory: 'Chest CT', description: 'CT scan of chest without contrast', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Chest', contrastRequired: false, radiationDose: '7 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Chest (With Contrast)', code: 'CTCC', category: 'CT Scan', subCategory: 'Chest CT', description: 'CT scan of chest with contrast', preparationInstructions: 'Fasting 4 hours, remove metal objects', bodyPart: 'Chest', contrastRequired: true, radiationDose: '7 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Abdomen & Pelvis (Plain)', code: 'CTAP', category: 'CT Scan', subCategory: 'Abdomen CT', description: 'CT scan of abdomen and pelvis without contrast', preparationInstructions: 'Fasting 6 hours, remove metal objects', bodyPart: 'Abdomen', contrastRequired: false, radiationDose: '10 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Abdomen & Pelvis (With Contrast)', code: 'CTAPC', category: 'CT Scan', subCategory: 'Abdomen CT', description: 'CT scan of abdomen and pelvis with contrast', preparationInstructions: 'Fasting 6 hours, remove metal objects', bodyPart: 'Abdomen', contrastRequired: true, radiationDose: '10 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Spine (Cervical)', code: 'CTSC', category: 'CT Scan', subCategory: 'Spine CT', description: 'CT scan of cervical spine', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Neck', contrastRequired: false, radiationDose: '6 mSv', turnaroundTime: '24-48 hours' },
  { name: 'CT Spine (Lumbar)', code: 'CTSL', category: 'CT Scan', subCategory: 'Spine CT', description: 'CT scan of lumbar spine', preparationInstructions: 'Remove metal objects, jewelry', bodyPart: 'Lower Back', contrastRequired: false, radiationDose: '6 mSv', turnaroundTime: '24-48 hours' },
  
  // MRI
  { name: 'MRI Brain (Plain)', code: 'MRB', category: 'MRI', subCategory: 'Brain MRI', description: 'MRI of brain without contrast', preparationInstructions: 'Remove all metal objects, no pacemaker', bodyPart: 'Head', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '48-72 hours' },
  { name: 'MRI Brain (With Contrast)', code: 'MRBC', category: 'MRI', subCategory: 'Brain MRI', description: 'MRI of brain with contrast', preparationInstructions: 'Fasting 4 hours, remove all metal objects', bodyPart: 'Head', contrastRequired: true, radiationDose: '0 mSv', turnaroundTime: '48-72 hours' },
  { name: 'MRI Spine (Cervical)', code: 'MRSC', category: 'MRI', subCategory: 'Spine MRI', description: 'MRI of cervical spine', preparationInstructions: 'Remove all metal objects, no pacemaker', bodyPart: 'Neck', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '48-72 hours' },
  { name: 'MRI Spine (Lumbar)', code: 'MRSL', category: 'MRI', subCategory: 'Spine MRI', description: 'MRI of lumbar spine', preparationInstructions: 'Remove all metal objects, no pacemaker', bodyPart: 'Lower Back', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '48-72 hours' },
  { name: 'MRI Knee', code: 'MRK', category: 'MRI', subCategory: 'Joint MRI', description: 'MRI of knee joint', preparationInstructions: 'Remove all metal objects', bodyPart: 'Knee', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '48-72 hours' },
  { name: 'MRI Shoulder', code: 'MRSH', category: 'MRI', subCategory: 'Joint MRI', description: 'MRI of shoulder joint', preparationInstructions: 'Remove all metal objects', bodyPart: 'Shoulder', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '48-72 hours' },
  
  // Ultrasound
  { name: 'Ultrasound Abdomen', code: 'USABD', category: 'Ultrasound', subCategory: 'Abdominal USG', description: 'Ultrasound of abdomen', preparationInstructions: 'Fasting 6-8 hours, full bladder', bodyPart: 'Abdomen', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Ultrasound Pelvis', code: 'USPEL', category: 'Ultrasound', subCategory: 'Pelvic USG', description: 'Ultrasound of pelvis', preparationInstructions: 'Full bladder required', bodyPart: 'Pelvis', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Ultrasound Obstetrics', code: 'USOB', category: 'Ultrasound', subCategory: 'Obstetric USG', description: 'Pregnancy ultrasound', preparationInstructions: 'Full bladder for early pregnancy', bodyPart: 'Pelvis', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Ultrasound Thyroid', code: 'USTHY', category: 'Ultrasound', subCategory: 'Neck USG', description: 'Ultrasound of thyroid gland', preparationInstructions: 'No preparation required', bodyPart: 'Neck', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Ultrasound Scrotum', code: 'USSCR', category: 'Ultrasound', subCategory: 'Genital USG', description: 'Ultrasound of scrotum', preparationInstructions: 'No preparation required', bodyPart: 'Scrotum', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '1-2 hours' },
  { name: 'Ultrasound Breast', code: 'USBR', category: 'Ultrasound', subCategory: 'Breast USG', description: 'Ultrasound of breast', preparationInstructions: 'No preparation required', bodyPart: 'Breast', contrastRequired: false, radiationDose: '0 mSv', turnaroundTime: '1-2 hours' },
];

async function seedCatalogData() {
  try {
    console.log('🌱 Starting catalog data seeding...\n');

    // Check if data already exists
    const existingMedicines = await db.select().from(medicineCatalog).limit(1);
    const existingLabTests = await db.select().from(labTestCatalog).limit(1);
    const existingRadiologyTests = await db.select().from(radiologyTestCatalog).limit(1);

    if (existingMedicines.length > 0 || existingLabTests.length > 0 || existingRadiologyTests.length > 0) {
      const forceSeed = process.argv.includes('--force');
      if (!forceSeed) {
        console.log('⚠️  Catalog data already exists. Skipping seed.');
        console.log('   To force seed anyway, use: npm run seed:catalog -- --force');
        return;
      } else {
        console.log('⚠️  Force seeding enabled. Existing data will be kept.\n');
      }
    }

    // Seed Medicines
    console.log('💊 Seeding medicines catalog...');
    let medicineCount = 0;
    let skippedCount = 0;
    for (const medicine of MEDICINES) {
      try {
        await db.insert(medicineCatalog).values({
          ...medicine,
          createdAt: sql`NOW()`,
        });
        medicineCount++;
      } catch (error: any) {
        // Check for duplicate key error (PostgreSQL error code 23505)
        if (error.code === '23505' || 
            error.message?.includes('duplicate') || 
            error.message?.includes('unique') ||
            error.cause?.code === '23505') {
          skippedCount++;
          // Silently skip duplicates
        } else {
          console.error(`   ❌ Error inserting ${medicine.name}:`, error.message);
          throw error;
        }
      }
    }
    console.log(`✅ Seeded ${medicineCount} medicines${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}\n`);

    // Seed Lab Tests
    console.log('🧪 Seeding lab tests catalog...');
    let labTestCount = 0;
    let skippedLabCount = 0;
    for (const test of LAB_TESTS) {
      try {
        await db.insert(labTestCatalog).values({
          ...test,
          createdAt: sql`NOW()`,
        });
        labTestCount++;
      } catch (error: any) {
        // Check for duplicate key error (PostgreSQL error code 23505)
        if (error.code === '23505' || 
            error.message?.includes('duplicate') || 
            error.message?.includes('unique') ||
            error.cause?.code === '23505') {
          skippedLabCount++;
          // Silently skip duplicates
        } else {
          console.error(`   ❌ Error inserting ${test.name}:`, error.message);
          throw error;
        }
      }
    }
    console.log(`✅ Seeded ${labTestCount} lab tests${skippedLabCount > 0 ? ` (${skippedLabCount} duplicates skipped)` : ''}\n`);

    // Seed Radiology Tests
    console.log('📷 Seeding radiology tests catalog...');
    let radiologyTestCount = 0;
    let skippedRadCount = 0;
    for (const test of RADIOLOGY_TESTS) {
      try {
        await db.insert(radiologyTestCatalog).values({
          ...test,
          createdAt: sql`NOW()`,
        });
        radiologyTestCount++;
      } catch (error: any) {
        // Check for duplicate key error (PostgreSQL error code 23505)
        if (error.code === '23505' || 
            error.message?.includes('duplicate') || 
            error.message?.includes('unique') ||
            error.cause?.code === '23505') {
          skippedRadCount++;
          // Silently skip duplicates
        } else {
          console.error(`   ❌ Error inserting ${test.name}:`, error.message);
          throw error;
        }
      }
    }
    console.log(`✅ Seeded ${radiologyTestCount} radiology tests${skippedRadCount > 0 ? ` (${skippedRadCount} duplicates skipped)` : ''}\n`);

    // Summary
    console.log('\n🎉 Catalog data seeding completed successfully!\n');
    console.log('📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Medicines: ${medicineCount}`);
    console.log(`✅ Lab Tests: ${labTestCount}`);
    console.log(`✅ Radiology Tests: ${radiologyTestCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding catalog data:', error);
    throw error;
  }
}

seedCatalogData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

