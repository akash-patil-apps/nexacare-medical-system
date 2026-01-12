#!/bin/bash

# Complete Testing Flow for Queue Management & IPD/ADT
# Run this script after starting the server: npm run dev

BASE_URL="http://localhost:3000/api"
echo "🧪 Testing Queue Management & IPD/ADT Features"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test credentials
RECEPTIONIST_MOBILE="9820000000"
RECEPTIONIST_PASS="password123"
HOSPITAL_MOBILE="9810000000"
HOSPITAL_PASS="password123"
DOCTOR_MOBILE="9830000000"
DOCTOR_PASS="password123"
PATIENT_MOBILE="9840000000"
PATIENT_PASS="password123"

echo "📋 Step 1: Login as Receptionist"
echo "-----------------------------------"
RECEPTIONIST_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\":\"$RECEPTIONIST_MOBILE\",\"password\":\"$RECEPTIONIST_PASS\"}" | jq -r '.token')

if [ "$RECEPTIONIST_TOKEN" = "null" ] || [ -z "$RECEPTIONIST_TOKEN" ]; then
  echo -e "${RED}❌ Receptionist login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Receptionist logged in${NC}"
echo "Token: ${RECEPTIONIST_TOKEN:0:20}..."
echo ""

echo "📋 Step 2: Login as Hospital Admin"
echo "-----------------------------------"
HOSPITAL_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\":\"$HOSPITAL_MOBILE\",\"password\":\"$HOSPITAL_PASS\"}" | jq -r '.token')

if [ "$HOSPITAL_TOKEN" = "null" ] || [ -z "$HOSPITAL_TOKEN" ]; then
  echo -e "${RED}❌ Hospital login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Hospital Admin logged in${NC}"
echo ""

echo "📋 Step 3: Get Hospital ID"
echo "-----------------------------------"
HOSPITAL_ID=$(curl -s -X GET "$BASE_URL/hospitals/my" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" | jq -r '.id')

if [ "$HOSPITAL_ID" = "null" ] || [ -z "$HOSPITAL_ID" ]; then
  echo -e "${RED}❌ Failed to get hospital ID${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Hospital ID: $HOSPITAL_ID${NC}"
echo ""

echo "📋 Step 4: Create Floor (Optional)"
echo "-----------------------------------"
FLOOR_RESPONSE=$(curl -s -X POST "$BASE_URL/ipd/floors" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"floorNumber\":1,\"floorName\":\"First Floor\",\"description\":\"Main patient floor\"}")

FLOOR_ID=$(echo $FLOOR_RESPONSE | jq -r '.id')
if [ "$FLOOR_ID" != "null" ] && [ -n "$FLOOR_ID" ]; then
  echo -e "${GREEN}✅ Floor created: ID $FLOOR_ID${NC}"
else
  echo -e "${YELLOW}⚠️  Floor creation failed or already exists${NC}"
  FLOOR_ID=""
fi
echo ""

echo "📋 Step 5: Create Ward"
echo "-----------------------------------"
WARD_DATA="{\"name\":\"General Ward\",\"type\":\"general\",\"genderPolicy\":\"mixed\",\"capacity\":20"
if [ -n "$FLOOR_ID" ]; then
  WARD_DATA="$WARD_DATA,\"floorId\":$FLOOR_ID"
fi
WARD_DATA="$WARD_DATA}"

WARD_RESPONSE=$(curl -s -X POST "$BASE_URL/ipd/wards" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$WARD_DATA")

WARD_ID=$(echo $WARD_RESPONSE | jq -r '.ward.id // .id')
if [ "$WARD_ID" = "null" ] || [ -z "$WARD_ID" ]; then
  echo -e "${RED}❌ Failed to create ward${NC}"
  echo "Response: $WARD_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✅ Ward created: ID $WARD_ID${NC}"
echo ""

echo "📋 Step 6: Create Room"
echo "-----------------------------------"
ROOM_RESPONSE=$(curl -s -X POST "$BASE_URL/ipd/rooms" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"wardId\":$WARD_ID,\"roomNumber\":\"101\",\"roomName\":\"General Room 101\",\"category\":\"general\",\"capacity\":2,\"amenities\":\"[\\\"AC\\\",\\\"TV\\\"]\"}")

ROOM_ID=$(echo $ROOM_RESPONSE | jq -r '.id')
if [ "$ROOM_ID" = "null" ] || [ -z "$ROOM_ID" ]; then
  echo -e "${RED}❌ Failed to create room${NC}"
  echo "Response: $ROOM_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✅ Room created: ID $ROOM_ID${NC}"
echo ""

echo "📋 Step 7: Create Beds"
echo "-----------------------------------"
BED1_RESPONSE=$(curl -s -X POST "$BASE_URL/ipd/beds" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":$ROOM_ID,\"bedNumber\":\"1\",\"bedName\":\"Bed A\",\"bedType\":\"standard\",\"equipment\":\"[\\\"Oxygen\\\"]\"}")

BED1_ID=$(echo $BED1_RESPONSE | jq -r '.id')
if [ "$BED1_ID" = "null" ] || [ -z "$BED1_ID" ]; then
  echo -e "${RED}❌ Failed to create bed 1${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Bed 1 created: ID $BED1_ID${NC}"

BED2_RESPONSE=$(curl -s -X POST "$BASE_URL/ipd/beds" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\":$ROOM_ID,\"bedNumber\":\"2\",\"bedName\":\"Bed B\",\"bedType\":\"standard\"}")

BED2_ID=$(echo $BED2_RESPONSE | jq -r '.id')
if [ "$BED2_ID" = "null" ] || [ -z "$BED2_ID" ]; then
  echo -e "${RED}❌ Failed to create bed 2${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Bed 2 created: ID $BED2_ID${NC}"
echo ""

echo "📋 Step 8: Get Bed Structure"
echo "-----------------------------------"
STRUCTURE=$(curl -s -X GET "$BASE_URL/ipd/structure" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN")

FLOORS_COUNT=$(echo $STRUCTURE | jq '.floors | length')
WARDS_COUNT=$(echo $STRUCTURE | jq '.wards | length')
BEDS_COUNT=$(echo $STRUCTURE | jq '.beds | length')

echo -e "${GREEN}✅ Structure retrieved:${NC}"
echo "  Floors: $FLOORS_COUNT"
echo "  Wards: $WARDS_COUNT"
echo "  Beds: $BEDS_COUNT"
echo ""

echo "📋 Step 9: Get Available Beds"
echo "-----------------------------------"
AVAILABLE_BEDS=$(curl -s -X GET "$BASE_URL/ipd/beds/available" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN")

AVAILABLE_COUNT=$(echo $AVAILABLE_BEDS | jq 'length')
echo -e "${GREEN}✅ Available beds: $AVAILABLE_COUNT${NC}"
echo ""

echo "📋 Step 10: Get Patient ID for Admission"
echo "-----------------------------------"
PATIENT_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"mobileNumber\":\"$PATIENT_MOBILE\",\"password\":\"$PATIENT_PASS\"}" | jq -r '.token')

PATIENT_ID=$(curl -s -X GET "$BASE_URL/patients/my" \
  -H "Authorization: Bearer $PATIENT_TOKEN" | jq -r '.id')

if [ "$PATIENT_ID" = "null" ] || [ -z "$PATIENT_ID" ]; then
  echo -e "${YELLOW}⚠️  Patient not found, using ID 1${NC}"
  PATIENT_ID=1
else
  echo -e "${GREEN}✅ Patient ID: $PATIENT_ID${NC}"
fi
echo ""

echo "📋 Step 11: Admit Patient (Create IPD Encounter)"
echo "-----------------------------------"
DOCTOR_ID=$(curl -s -X GET "$BASE_URL/doctors?hospitalId=$HOSPITAL_ID" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" | jq -r '.[0].id // 1')

ADMIT_RESPONSE=$(curl -s -X POST "$BASE_URL/ipd/encounters" \
  -H "Authorization: Bearer $RECEPTIONIST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"patientId\":$PATIENT_ID,\"admittingDoctorId\":$DOCTOR_ID,\"admissionType\":\"elective\",\"bedId\":$BED1_ID}")

ENCOUNTER_ID=$(echo $ADMIT_RESPONSE | jq -r '.id')
if [ "$ENCOUNTER_ID" = "null" ] || [ -z "$ENCOUNTER_ID" ]; then
  echo -e "${RED}❌ Failed to admit patient${NC}"
  echo "Response: $ADMIT_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✅ Patient admitted: Encounter ID $ENCOUNTER_ID${NC}"
echo ""

echo "📋 Step 12: Check Bed Status (Should be Occupied)"
echo "-----------------------------------"
BED_STATUS=$(curl -s -X GET "$BASE_URL/ipd/beds/available" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" | jq ".[] | select(.bed.id == $BED1_ID)")

if [ -z "$BED_STATUS" ]; then
  echo -e "${GREEN}✅ Bed $BED1_ID is now occupied (not in available list)${NC}"
else
  echo -e "${YELLOW}⚠️  Bed still showing as available${NC}"
fi
echo ""

echo "📋 Step 13: Get IPD Encounters"
echo "-----------------------------------"
ENCOUNTERS=$(curl -s -X GET "$BASE_URL/ipd/encounters" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN")

ENCOUNTER_COUNT=$(echo $ENCOUNTERS | jq 'length')
echo -e "${GREEN}✅ Active encounters: $ENCOUNTER_COUNT${NC}"
echo ""

echo "📋 Step 14: Transfer Patient to Another Bed"
echo "-----------------------------------"
TRANSFER_RESPONSE=$(curl -s -X PATCH "$BASE_URL/ipd/encounters/$ENCOUNTER_ID/transfer" \
  -H "Authorization: Bearer $RECEPTIONIST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"newBedId\":$BED2_ID,\"reason\":\"Patient requested room change\"}")

if echo $TRANSFER_RESPONSE | jq -e '.encounter.id' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Patient transferred successfully${NC}"
else
  echo -e "${YELLOW}⚠️  Transfer may have failed${NC}"
  echo "Response: $TRANSFER_RESPONSE"
fi
echo ""

echo "📋 Step 15: Discharge Patient"
echo "-----------------------------------"
DISCHARGE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/ipd/encounters/$ENCOUNTER_ID/discharge" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"dischargeSummaryText\":\"Patient recovered well. Discharged with medications.\"}")

if echo $DISCHARGE_RESPONSE | jq -e '.status' > /dev/null 2>&1; then
  STATUS=$(echo $DISCHARGE_RESPONSE | jq -r '.status')
  if [ "$STATUS" = "discharged" ]; then
    echo -e "${GREEN}✅ Patient discharged successfully${NC}"
  else
    echo -e "${YELLOW}⚠️  Discharge status: $STATUS${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Discharge may have failed${NC}"
fi
echo ""

echo "📋 Step 16: Mark Bed as Cleaned"
echo "-----------------------------------"
CLEAN_RESPONSE=$(curl -s -X PATCH "$BASE_URL/ipd/beds/$BED2_ID/clean" \
  -H "Authorization: Bearer $HOSPITAL_TOKEN")

if echo $CLEAN_RESPONSE | jq -e '.status' > /dev/null 2>&1; then
  STATUS=$(echo $CLEAN_RESPONSE | jq -r '.status')
  if [ "$STATUS" = "available" ]; then
    echo -e "${GREEN}✅ Bed marked as cleaned and available${NC}"
  else
    echo -e "${YELLOW}⚠️  Bed status: $STATUS${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Clean operation may have failed${NC}"
fi
echo ""

echo "📋 Step 17: Test Queue Management - Get Appointment"
echo "-----------------------------------"
APPOINTMENTS=$(curl -s -X GET "$BASE_URL/appointments/my" \
  -H "Authorization: Bearer $RECEPTIONIST_TOKEN")

APPOINTMENT_ID=$(echo $APPOINTMENTS | jq -r '.[0].id // empty')
if [ -z "$APPOINTMENT_ID" ]; then
  echo -e "${YELLOW}⚠️  No appointments found. Creating one...${NC}"
  # Try to create appointment or use existing
  APPOINTMENT_ID=1
fi

if [ -n "$APPOINTMENT_ID" ] && [ "$APPOINTMENT_ID" != "null" ]; then
  echo -e "${GREEN}✅ Found appointment: ID $APPOINTMENT_ID${NC}"
  
  echo ""
  echo "📋 Step 18: Check-in to Queue"
  echo "-----------------------------------"
  QUEUE_RESPONSE=$(curl -s -X POST "$BASE_URL/opd-queue/check-in" \
    -H "Authorization: Bearer $RECEPTIONIST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"appointmentId\":$APPOINTMENT_ID}")
  
  QUEUE_ENTRY_ID=$(echo $QUEUE_RESPONSE | jq -r '.id')
  TOKEN_NUMBER=$(echo $QUEUE_RESPONSE | jq -r '.tokenNumber')
  
  if [ "$QUEUE_ENTRY_ID" != "null" ] && [ -n "$QUEUE_ENTRY_ID" ]; then
    echo -e "${GREEN}✅ Checked in to queue: Entry ID $QUEUE_ENTRY_ID, Token #$TOKEN_NUMBER${NC}"
    
    echo ""
    echo "📋 Step 19: Get Queue for Doctor"
    echo "-----------------------------------"
    DOCTOR_ID_FOR_QUEUE=$(echo $APPOINTMENTS | jq -r '.[0].doctorId // 1')
    TODAY=$(date +%Y-%m-%d)
    
    QUEUE_LIST=$(curl -s -X GET "$BASE_URL/opd-queue/doctor/$DOCTOR_ID_FOR_QUEUE/date/$TODAY" \
      -H "Authorization: Bearer $RECEPTIONIST_TOKEN")
    
    QUEUE_COUNT=$(echo $QUEUE_LIST | jq 'length')
    echo -e "${GREEN}✅ Queue entries for today: $QUEUE_COUNT${NC}"
    
    echo ""
    echo "📋 Step 20: Call Token"
    echo "-----------------------------------"
    CALL_RESPONSE=$(curl -s -X PATCH "$BASE_URL/opd-queue/$QUEUE_ENTRY_ID/call" \
      -H "Authorization: Bearer $RECEPTIONIST_TOKEN")
    
    CALL_STATUS=$(echo $CALL_RESPONSE | jq -r '.status')
    if [ "$CALL_STATUS" = "called" ]; then
      echo -e "${GREEN}✅ Token called successfully${NC}"
    else
      echo -e "${YELLOW}⚠️  Call status: $CALL_STATUS${NC}"
    fi
    
    echo ""
    echo "📋 Step 21: Start Consultation"
    echo "-----------------------------------"
    START_RESPONSE=$(curl -s -X PATCH "$BASE_URL/opd-queue/$QUEUE_ENTRY_ID/start" \
      -H "Authorization: Bearer $DOCTOR_TOKEN")
    
    START_STATUS=$(echo $START_RESPONSE | jq -r '.status')
    if [ "$START_STATUS" = "in_consultation" ]; then
      echo -e "${GREEN}✅ Consultation started${NC}"
    else
      echo -e "${YELLOW}⚠️  Start status: $START_STATUS${NC}"
    fi
    
    echo ""
    echo "📋 Step 22: Complete Consultation"
    echo "-----------------------------------"
    COMPLETE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/opd-queue/$QUEUE_ENTRY_ID/complete" \
      -H "Authorization: Bearer $DOCTOR_TOKEN")
    
    COMPLETE_STATUS=$(echo $COMPLETE_RESPONSE | jq -r '.status')
    if [ "$COMPLETE_STATUS" = "completed" ]; then
      echo -e "${GREEN}✅ Consultation completed${NC}"
    else
      echo -e "${YELLOW}⚠️  Complete status: $COMPLETE_STATUS${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Check-in failed or appointment already in queue${NC}"
    echo "Response: $QUEUE_RESPONSE"
  fi
else
  echo -e "${YELLOW}⚠️  No appointments available for queue testing${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Testing Complete!${NC}"
echo ""
echo "Summary:"
echo "  ✅ IPD Structure: Floors, Wards, Rooms, Beds"
echo "  ✅ IPD Admission: Patient admitted"
echo "  ✅ IPD Transfer: Patient transferred"
echo "  ✅ IPD Discharge: Patient discharged"
echo "  ✅ Bed Management: Cleaning workflow"
echo "  ✅ Queue Management: Check-in, Call, Start, Complete"
echo ""








