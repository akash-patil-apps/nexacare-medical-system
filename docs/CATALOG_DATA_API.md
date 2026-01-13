# Catalog Data API Documentation

## Overview
This document describes the catalog data system for medicines, lab tests, and radiology tests. These catalogs provide master data that can be accessed by all dashboards (doctors, nurses, pharmacists, lab technicians, radiology technicians, etc.) for selecting medicines, injections, and tests when treating patients.

## Database Tables

### 1. Medicine Catalog (`medicine_catalog`)
Master list of all medicines, injections, and medications available in the system.

**Fields:**
- `id`: Primary key
- `name`: Medicine name (unique)
- `genericName`: Generic name
- `brandName`: Brand name
- `category`: tablet, injection, syrup, capsule, ointment, etc.
- `type`: medicine, injection, vaccine, etc.
- `dosageForm`: tablet, capsule, injection, syrup, etc.
- `strength`: 500mg, 10ml, etc.
- `unit`: mg, ml, tablet, etc.
- `manufacturer`: Manufacturer name
- `description`: Description
- `indications`: What it's used for
- `contraindications`: When not to use
- `sideEffects`: Side effects
- `storageConditions`: Storage instructions
- `isActive`: Active status
- `createdAt`, `updatedAt`: Timestamps

### 2. Lab Test Catalog (`lab_test_catalog`)
Master list of all lab tests available.

**Fields:**
- `id`: Primary key
- `name`: Test name (unique)
- `code`: Test code like CBC, LFT, etc. (unique)
- `category`: Blood Test, Urine Test, Stool Test, etc.
- `subCategory`: Hematology, Biochemistry, Microbiology, etc.
- `description`: Test description
- `preparationInstructions`: Fasting required, etc.
- `sampleType`: Blood, Urine, Stool, Sputum, etc.
- `normalRange`: Normal values
- `turnaroundTime`: Hours or days
- `isActive`: Active status
- `createdAt`, `updatedAt`: Timestamps

### 3. Radiology Test Catalog (`radiology_test_catalog`)
Master list of all imaging/radiology tests available.

**Fields:**
- `id`: Primary key
- `name`: Test name (unique)
- `code`: Test code like XRAY, CT, MRI, etc. (unique)
- `category`: X-Ray, CT Scan, MRI, Ultrasound, etc.
- `subCategory`: Chest X-Ray, Abdominal CT, etc.
- `description`: Test description
- `preparationInstructions`: Fasting, contrast, etc.
- `bodyPart`: Chest, Abdomen, Head, etc.
- `contrastRequired`: Boolean
- `radiationDose`: For X-Ray/CT
- `turnaroundTime`: Hours or days
- `isActive`: Active status
- `createdAt`, `updatedAt`: Timestamps

## API Endpoints

### Medicines API (`/api/medicines`)

#### GET `/api/medicines`
Get all medicines from catalog.

**Query Parameters:**
- `search` (optional): Search by name, generic name, or brand name
- `category` (optional): Filter by category (tablet, injection, syrup, etc.)
- `type` (optional): Filter by type (medicine, injection, vaccine, etc.)
- `limit` (optional, default: 100): Limit results

**Example:**
```
GET /api/medicines?search=paracetamol&category=tablet
GET /api/medicines?type=injection
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Paracetamol 500mg",
    "genericName": "Paracetamol",
    "brandName": "Crocin",
    "category": "tablet",
    "type": "medicine",
    "dosageForm": "tablet",
    "strength": "500mg",
    "unit": "tablet",
    "manufacturer": "GSK",
    "indications": "Fever, Pain relief",
    "storageConditions": "Store at room temperature",
    "isActive": true
  }
]
```

#### GET `/api/medicines/:id`
Get medicine by ID.

#### GET `/api/medicines/categories/list`
Get list of all medicine categories.

#### GET `/api/medicines/types/list`
Get list of all medicine types.

### Lab Tests API (`/api/lab-tests`)

#### GET `/api/lab-tests`
Get all lab tests from catalog.

**Query Parameters:**
- `search` (optional): Search by name, code, or description
- `category` (optional): Filter by category (Blood Test, Urine Test, etc.)
- `subCategory` (optional): Filter by subCategory (Hematology, Biochemistry, etc.)
- `limit` (optional, default: 200): Limit results

**Example:**
```
GET /api/lab-tests?category=Blood Test
GET /api/lab-tests?search=CBC
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Complete Blood Count (CBC)",
    "code": "CBC",
    "category": "Blood Test",
    "subCategory": "Hematology",
    "description": "Complete blood count including RBC, WBC, Hemoglobin, Platelets",
    "preparationInstructions": "No fasting required",
    "sampleType": "Blood",
    "normalRange": "RBC: 4.5-5.5 million/μL, WBC: 4000-11000/μL, Hb: 12-16 g/dL",
    "turnaroundTime": "2-4 hours",
    "isActive": true
  }
]
```

#### GET `/api/lab-tests/:id`
Get lab test by ID.

#### GET `/api/lab-tests/categories/list`
Get list of all lab test categories.

### Radiology Tests API (`/api/radiology-tests`)

#### GET `/api/radiology-tests`
Get all radiology tests from catalog.

**Query Parameters:**
- `search` (optional): Search by name, code, or description
- `category` (optional): Filter by category (X-Ray, CT Scan, MRI, etc.)
- `subCategory` (optional): Filter by subCategory
- `bodyPart` (optional): Filter by body part (Chest, Abdomen, Head, etc.)
- `limit` (optional, default: 200): Limit results

**Example:**
```
GET /api/radiology-tests?category=X-Ray
GET /api/radiology-tests?bodyPart=Chest
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Chest X-Ray (PA View)",
    "code": "CXRPA",
    "category": "X-Ray",
    "subCategory": "Chest X-Ray",
    "description": "Postero-anterior view of chest",
    "preparationInstructions": "Remove metal objects, jewelry",
    "bodyPart": "Chest",
    "contrastRequired": false,
    "radiationDose": "0.1 mSv",
    "turnaroundTime": "1-2 hours",
    "isActive": true
  }
]
```

#### GET `/api/radiology-tests/:id`
Get radiology test by ID.

#### GET `/api/radiology-tests/categories/list`
Get list of all radiology test categories.

## Seed Data

### Running Seed Script
```bash
npm run seed:catalog
```

### Seed Data Summary
- **Medicines**: 21 entries (tablets, injections, syrups)
- **Lab Tests**: 21 entries (blood tests, urine tests, stool tests)
- **Radiology Tests**: 28 entries (X-Rays, CT Scans, MRIs, Ultrasounds)

## Usage in Dashboards

### Doctor Dashboard
- **Prescriptions**: Select medicines from `/api/medicines`
- **Lab Requests**: Select lab tests from `/api/lab-tests`
- **Imaging Orders**: Select radiology tests from `/api/radiology-tests`

### Nurse Dashboard
- **Medication Administration**: Select medicines/injections from `/api/medicines?type=injection` or `/api/medicines?category=injection`
- **View Test Results**: Access lab and radiology test information

### Pharmacist Dashboard
- **Medicine Inventory**: View all medicines from `/api/medicines`
- **Dispensing**: Search and select medicines by name, category, or type

### Lab Technician Dashboard
- **Test Catalog**: View all available lab tests from `/api/lab-tests`
- **Test Information**: Get test details including preparation instructions

### Radiology Technician Dashboard
- **Imaging Catalog**: View all available radiology tests from `/api/radiology-tests`
- **Test Information**: Get test details including preparation and radiation dose

## Access Control
All endpoints require authentication via `authenticateToken` middleware. All authenticated users (doctors, nurses, pharmacists, lab technicians, radiology technicians, etc.) can access these catalog endpoints.

## Future Enhancements
- Add pricing information
- Add inventory/stock levels
- Add medicine interactions
- Add test packages/panels
- Add test result templates
- Add medicine dosage calculators

