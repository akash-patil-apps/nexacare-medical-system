// Script to import medicines from CSV file into medicine_catalog table
import { db } from '../server/db';
import { medicineCatalog } from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface CSVMedicine {
  id: string;
  name: string;
  price: string;
  isDiscontinued: string;
  manufacturerName: string;
  type: string;
  packSizeLabel: string;
  shortComposition1: string;
  shortComposition2: string;
}

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Extract category and dosage form from pack_size_label
function extractCategoryAndDosageForm(packSizeLabel: string): { category: string; dosageForm: string } {
  const lower = packSizeLabel.toLowerCase();
  
  // Determine category and dosage form
  if (lower.includes('tablet')) {
    return { category: 'tablet', dosageForm: 'tablet' };
  } else if (lower.includes('capsule')) {
    return { category: 'capsule', dosageForm: 'capsule' };
  } else if (lower.includes('syrup') || lower.includes('oral suspension') || lower.includes('oral solution')) {
    return { category: 'syrup', dosageForm: 'syrup' };
  } else if (lower.includes('injection') || lower.includes('injectable')) {
    return { category: 'injection', dosageForm: 'injection' };
  } else if (lower.includes('cream') || lower.includes('ointment')) {
    return { category: 'ointment', dosageForm: 'cream' };
  } else if (lower.includes('drops')) {
    return { category: 'drops', dosageForm: 'drops' };
  } else if (lower.includes('inhaler')) {
    return { category: 'inhaler', dosageForm: 'inhaler' };
  } else if (lower.includes('gel')) {
    return { category: 'gel', dosageForm: 'gel' };
  } else if (lower.includes('spray')) {
    return { category: 'spray', dosageForm: 'spray' };
  } else if (lower.includes('powder')) {
    return { category: 'powder', dosageForm: 'powder' };
  }
  
  // Default to tablet if unknown
  return { category: 'tablet', dosageForm: 'tablet' };
}

// Extract strength from composition
function extractStrength(composition1: string, composition2: string): string | null {
  const combined = `${composition1} ${composition2}`.trim();
  if (!combined) return null;
  
  // Try to extract strength patterns like "500mg", "10ml", "5mg/5ml", etc.
  const strengthMatch = combined.match(/(\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg|IU|%)\s*(?:\/\s*\d+\s*(?:mg|ml|g|mcg|IU|%))?)/i);
  if (strengthMatch) {
    return strengthMatch[1].trim();
  }
  
  return null;
}

// Extract generic name from composition
function extractGenericName(composition1: string, composition2: string): string | null {
  const combined = `${composition1} ${composition2}`.trim();
  if (!combined) return null;
  
  // Remove strength patterns and clean up
  let generic = combined
    .replace(/\s*\([^)]*\)/g, '') // Remove parentheses content
    .replace(/\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg|IU|%)\s*(?:\/\s*\d+\s*(?:mg|ml|g|mcg|IU|%))?/gi, '') // Remove strength
    .replace(/\s+/g, ' ')
    .trim();
  
  // If multiple ingredients, take the first one
  if (generic.includes(',')) {
    generic = generic.split(',')[0].trim();
  }
  
  return generic || null;
}

// Determine type from CSV type field
function determineType(csvType: string): string {
  const lower = csvType.toLowerCase();
  if (lower === 'allopathy') {
    return 'medicine';
  } else if (lower === 'homeopathy' || lower === 'ayurveda' || lower === 'unani') {
    return 'medicine'; // Still medicine, just different system
  }
  return 'medicine'; // Default
}

async function importMedicinesFromCSV(csvFilePath: string) {
  try {
    console.log('📂 Reading CSV file...');
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    console.log(`📊 Found ${dataLines.length} medicine records in CSV\n`);
    
    // Load existing medicine names into memory for fast lookup
    console.log('🔍 Checking existing medicines in database...');
    const existingMedicines = await db
      .select({ name: medicineCatalog.name })
      .from(medicineCatalog);
    
    const existingNamesSet = new Set(existingMedicines.map(m => m.name.toLowerCase().trim()));
    console.log(`   Found ${existingMedicines.length} existing medicines in database\n`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process in batches to avoid memory issues
    const batchSize = 1000;
    const totalBatches = Math.ceil(dataLines.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, dataLines.length);
      const batch = dataLines.slice(start, end);
      
      console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (rows ${start + 1}-${end})...`);
      
      for (const line of batch) {
        try {
          const fields = parseCSVLine(line);
          
          if (fields.length < 9) {
            skippedCount++;
            continue;
          }
          
          const csvMed: CSVMedicine = {
            id: fields[0],
            name: fields[1]?.trim() || '',
            price: fields[2]?.trim() || '',
            isDiscontinued: fields[3]?.trim() || 'FALSE',
            manufacturerName: fields[4]?.trim() || '',
            type: fields[5]?.trim() || 'allopathy',
            packSizeLabel: fields[6]?.trim() || '',
            shortComposition1: fields[7]?.trim() || '',
            shortComposition2: fields[8]?.trim() || '',
          };
          
          // Skip if name is empty
          if (!csvMed.name) {
            skippedCount++;
            continue;
          }
          
          // Extract data
          const { category, dosageForm } = extractCategoryAndDosageForm(csvMed.packSizeLabel);
          const strength = extractStrength(csvMed.shortComposition1, csvMed.shortComposition2);
          const genericName = extractGenericName(csvMed.shortComposition1, csvMed.shortComposition2);
          const type = determineType(csvMed.type);
          const isActive = csvMed.isDiscontinued.toUpperCase() !== 'TRUE';
          
          // Determine unit from pack size or strength
          let unit: string | null = null;
          if (category === 'tablet' || category === 'capsule') {
            unit = 'tablet';
          } else if (category === 'syrup' || category === 'drops') {
            unit = 'ml';
          } else if (category === 'injection') {
            unit = 'vial';
          } else if (category === 'ointment' || category === 'cream' || category === 'gel') {
            unit = 'gm';
          } else if (category === 'inhaler') {
            unit = 'puff';
          }
          
          // Check if medicine already exists (by name - unique constraint)
          // Use in-memory Set for fast lookup
          if (existingNamesSet.has(csvMed.name.toLowerCase().trim())) {
            // Medicine already exists, skip it
            skippedCount++;
            continue;
          }
          
          // Try to insert
          try {
            await db.insert(medicineCatalog).values({
              name: csvMed.name,
              genericName: genericName,
              brandName: csvMed.name.includes(' ') ? csvMed.name.split(' ')[0] : null, // Use first word as brand name
              category: category,
              type: type,
              dosageForm: dosageForm,
              strength: strength,
              unit: unit,
              manufacturer: csvMed.manufacturerName || null,
              description: csvMed.packSizeLabel ? `Pack: ${csvMed.packSizeLabel}` : null,
              isActive: isActive,
              createdAt: sql`NOW()`,
            });
            importedCount++;
            // Add to existing set to avoid duplicate inserts in same run
            existingNamesSet.add(csvMed.name.toLowerCase().trim());
          } catch (error: any) {
            // Fallback error handling (shouldn't happen if check above works, but just in case)
            if (error.code === '23505' || 
                error.message?.includes('duplicate') || 
                error.message?.includes('unique') ||
                error.cause?.code === '23505') {
              skippedCount++;
            } else {
              errorCount++;
              errors.push(`Error inserting ${csvMed.name}: ${error.message}`);
              if (errors.length <= 10) {
                console.error(`   ❌ Error inserting ${csvMed.name}:`, error.message);
              }
            }
          }
        } catch (error: any) {
          errorCount++;
          errors.push(`Error parsing line: ${error.message}`);
        }
      }
      
      // Progress update
      const progress = ((batchIndex + 1) / totalBatches * 100).toFixed(1);
      console.log(`   Progress: ${progress}% (${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors)\n`);
    }
    
    // Summary
    console.log('\n🎉 Medicine import completed!\n');
    console.log('📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully imported: ${importedCount}`);
    console.log(`⏭️  Skipped (duplicates/empty): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (errors.length > 0 && errors.length <= 20) {
      console.log('⚠️  Sample errors:');
      errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error importing medicines:', error);
    throw error;
  }
}

// Main execution
const csvFilePath = process.argv[2] || '/Users/akashpatil/Downloads/A_Z_medicines_dataset_of_India.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ CSV file not found: ${csvFilePath}`);
  console.log('\nUsage: tsx scripts/import-medicines-csv.ts [path-to-csv-file]');
  process.exit(1);
}

console.log(`📁 CSV File: ${csvFilePath}\n`);

importMedicinesFromCSV(csvFilePath)
  .then(() => {
    console.log('✅ Import process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  });
