# IPD Structure Guide - Understanding Wards, Rooms, and Beds

## Overview

IPD (In-Patient Department) management requires organizing hospital beds in a hierarchical structure. This guide explains the relationship between **Floors**, **Wards**, **Rooms**, and **Beds**.

## Hierarchy Structure

```
Hospital
  └── Floor (Optional)
      └── Ward
          └── Room
              └── Bed
```

## Components Explained

### 1. **Floor** (Optional)
- **What it is**: A physical floor level in the hospital building
- **Purpose**: Organize wards by building level
- **Examples**: 
  - Ground Floor (Floor #0)
  - First Floor (Floor #1)
  - Second Floor (Floor #2)
  - Basement (Floor #-1)
- **When to use**: 
  - ✅ Use if your hospital has multiple floors
  - ❌ Skip if all wards are on the same level

### 2. **Ward** (Required)
- **What it is**: A section or department within the hospital
- **Purpose**: Group related rooms together by medical specialty or patient type
- **Examples**:
  - **General Ward**: For general medical patients
  - **ICU (Intensive Care Unit)**: For critical patients
  - **Pediatric Ward**: For children
  - **Maternity Ward**: For mothers and newborns
  - **Surgical Ward**: For post-operative patients
  - **Emergency Room (ER)**: For emergency cases
- **Key Features**:
  - Has a **type** (General, ICU, ER, etc.)
  - Can have **gender policy** (Mixed, Male Only, Female Only)
  - Can have **capacity** (total number of beds)
  - Can be assigned to a **floor** (optional)

**Wards vs Rooms:**
- ❌ **NOT the same!**
- **Ward** = Department/Section (e.g., "ICU Ward", "General Ward")
- **Room** = Physical room within a ward (e.g., "Room 101", "Room 102")
- One **Ward** contains multiple **Rooms**

### 3. **Room** (Required)
- **What it is**: A physical room within a ward
- **Purpose**: A space that contains one or more beds
- **Examples**:
  - Room 101 (General category, 2 beds)
  - VIP Suite (VIP category, 1 bed)
  - Deluxe Room (Deluxe category, 1 bed)
  - ICU Room 1 (ICU category, 1 bed)
- **Key Features**:
  - Has a **room number** (e.g., "101", "201")
  - Has a **category** (General, Private, Semi-Private, Deluxe, VIP, ICU)
  - Has a **capacity** (number of beds in the room)
  - Can have **amenities** (AC, TV, WiFi, etc.)
  - **Must belong to a Ward**

### 4. **Bed** (Required)
- **What it is**: An individual patient bed
- **Purpose**: The actual bed where a patient is admitted
- **Examples**:
  - Bed 1, Bed 2 (in Room 101)
  - Bed A, Bed B (in VIP Suite)
- **Key Features**:
  - Has a **bed number** (e.g., "1", "2", "A", "B")
  - Has a **status** (Available, Occupied, Cleaning, Blocked)
  - Has a **bed type** (Standard, Electric, ICU, Ventilator)
  - Can have **equipment** (Oxygen, Monitor, etc.)
  - **Must belong to a Room**

## Real-World Example

### Hospital: "City General Hospital"

**Floor 1 (First Floor)**
- **ICU Ward**
  - **Room 101** (ICU Room)
    - **Bed 1** (Ventilator Bed)
    - **Bed 2** (ICU Bed)
  - **Room 102** (ICU Room)
    - **Bed 1** (ICU Bed)

**Floor 0 (Ground Floor)**
- **General Ward**
  - **Room 201** (General, 2 beds)
    - **Bed 1** (Standard)
    - **Bed 2** (Standard)
  - **Room 202** (General, 2 beds)
    - **Bed 1** (Standard)
    - **Bed 2** (Standard)
  - **Room 301** (Private, 1 bed)
    - **Bed 1** (Electric)

- **Maternity Ward**
  - **Room 401** (Private, 1 bed)
    - **Bed 1** (Standard)
  - **Room 402** (Semi-Private, 2 beds)
    - **Bed 1** (Standard)
    - **Bed 2** (Standard)

## Setup Flow (Step-by-Step)

### Step 1: Create Floors (Optional)
1. Go to **IPD Management** → **Bed Structure** → **Floors** tab
2. Click **"+ Add Floor"**
3. Enter:
   - Floor Number: `0` (for Ground), `1` (for First), etc.
   - Floor Name: "Ground Floor", "First Floor"
4. Click **"Create"**

### Step 2: Create Wards (Required)
1. Go to **Wards** tab
2. Click **"+ Add Ward"**
3. Enter:
   - **Ward Name**: "General Ward", "ICU", "Maternity Ward"
   - **Type**: Select from dropdown (General, ICU, ER, Pediatric, Maternity, Surgical, Private)
   - **Floor** (Optional): Select floor if you created floors
   - **Gender Policy**: Mixed, Male Only, or Female Only
   - **Capacity**: Total number of beds in this ward (optional)
4. Click **"Create"**

### Step 3: Create Rooms (Required)
1. Go to **Rooms** tab
2. Click **"+ Add Room"**
3. **First, select a Ward** from the dropdown (this is required!)
4. Enter:
   - **Room Number**: "101", "201", "301"
   - **Room Name** (Optional): "VIP Suite", "Deluxe Room"
   - **Category**: General, Semi-Private, Private, Deluxe, VIP, or ICU
   - **Capacity**: Number of beds in this room (e.g., 1, 2, 4)
   - **Amenities** (Optional): JSON array like `["AC", "TV", "WiFi"]`
5. Click **"Create"**

### Step 4: Create Beds (Required)
1. Go to **Beds** tab
2. Click **"+ Add Bed"**
3. **First, select a Room** from the dropdown (this is required!)
4. Enter:
   - **Bed Number**: "1", "2", "A", "B"
   - **Bed Name** (Optional): "Bed A", "Bed 1"
   - **Bed Type**: Standard, Electric, Manual, ICU Bed, or Ventilator Bed
   - **Equipment** (Optional): JSON array like `["Oxygen", "Monitor"]`
   - **Notes** (Optional): Special notes about this bed
5. Click **"Create"**

## Common Questions

### Q: Do I need to create floors?
**A:** No, floors are optional. You can skip floors and create wards directly.

### Q: What's the difference between Ward and Room?
**A:** 
- **Ward** = Department (e.g., "ICU Ward", "General Ward")
- **Room** = Physical room within a ward (e.g., "Room 101", "Room 102")
- One ward can have multiple rooms

### Q: Can I have rooms without wards?
**A:** No, every room must belong to a ward.

### Q: Can I have beds without rooms?
**A:** No, every bed must belong to a room.

### Q: What's the minimum setup?
**A:** 
1. Create at least 1 **Ward**
2. Create at least 1 **Room** in that ward
3. Create at least 1 **Bed** in that room

### Q: How many beds can a room have?
**A:** It depends on the room category:
- **Private/VIP/Deluxe**: Usually 1 bed
- **Semi-Private**: Usually 2 beds
- **General**: Can have 2-4 beds
- **ICU**: Usually 1 bed (for critical care)

## Quick Start Example

For quick testing, create this minimal structure:

1. **Ward**: "General Ward" (Type: General)
2. **Room**: "Room 101" (Category: General, Capacity: 2) in "General Ward"
3. **Beds**: 
   - "Bed 1" (Type: Standard) in "Room 101"
   - "Bed 2" (Type: Standard) in "Room 101"

Now you can admit patients to these beds!

## Visual Representation

```
🏥 Hospital
  │
  ├── 🏢 Floor 1 (First Floor)
  │   │
  │   └── 🏥 ICU Ward
  │       │
  │       ├── 🚪 Room 101 (ICU)
  │       │   ├── 🛏️ Bed 1 (Ventilator)
  │       │   └── 🛏️ Bed 2 (ICU)
  │       │
  │       └── 🚪 Room 102 (ICU)
  │           └── 🛏️ Bed 1 (ICU)
  │
  └── 🏢 Floor 0 (Ground Floor)
      │
      ├── 🏥 General Ward
      │   │
      │   ├── 🚪 Room 201 (General, 2 beds)
      │   │   ├── 🛏️ Bed 1
      │   │   └── 🛏️ Bed 2
      │   │
      │   └── 🚪 Room 301 (Private, 1 bed)
      │       └── 🛏️ Bed 1
      │
      └── 🏥 Maternity Ward
          │
          └── 🚪 Room 401 (Private, 1 bed)
              └── 🛏️ Bed 1
```

## Summary

- **Floor** (Optional) → Organizes by building level
- **Ward** (Required) → Department/Section (e.g., ICU, General)
- **Room** (Required) → Physical room within a ward
- **Bed** (Required) → Individual patient bed

**Remember**: Ward ≠ Room. Wards contain Rooms, and Rooms contain Beds!








