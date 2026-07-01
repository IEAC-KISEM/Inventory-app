# INSTRUMENT EQUIPMENT INVENTORY MANAGEMENT SYSTEM
## Complete Master Prompt & Implementation Guide

---

## 🎯 PROJECT OVERVIEW

Build a comprehensive real-time Instrument Equipment Inventory Management System with 4 main modules, 4 concurrent user support, automated knowledge generation, and seamless real-time synchronization.

**Tech Stack:**
- **Frontend:** React.js + TypeScript + Tailwind CSS (light theme, animated)
- **Backend:** Node.js/Express.js + PostgreSQL
- **Real-time:** WebSocket (Socket.io)
- **File Storage:** Local filesystem with auto-structure generation
- **Excel Generation:** ExcelJS
- **Deployment:** Can be containerized with Docker

---

## 📋 PROJECT STRUCTURE

```
inventory-management-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Equipment.ts
│   │   │   ├── Booking.ts
│   │   │   ├── Calibration.ts
│   │   │   ├── User.ts
│   │   │   └── LearningContent.ts
│   │   ├── routes/
│   │   │   ├── equipment.ts
│   │   │   ├── booking.ts
│   │   │   ├── calibration.ts
│   │   │   ├── learning.ts
│   │   │   └── reports.ts
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── inventoryService.ts
│   │   │   ├── calibrationService.ts
│   │   │   ├── bookingService.ts
│   │   │   ├── excelService.ts
│   │   │   ├── knowledgeService.ts
│   │   │   └── syncService.ts (WebSocket)
│   │   ├── utils/
│   │   ├── config/
│   │   └── server.ts
│   ├── uploads/
│   │   ├── manuals/
│   │   │   ├── Fluke/
│   │   │   ├── Hioki/
│   │   │   ├── Testo/
│   │   │   ├── Krykard/
│   │   │   ├── Kane/
│   │   │   ├── Acron/
│   │   │   ├── Flexim/
│   │   │   ├── VPS/
│   │   │   └── UE_Systems/
│   │   └── product-images/
│   ├── database/
│   │   ├── seeds/
│   │   │   └── seedInventory.ts
│   │   └── migrations/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   │   ├── OverviewCard.tsx
│   │   │   │   ├── CalibrationDueChart.tsx
│   │   │   │   ├── IndustryBreakdown.tsx
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── Inventory/
│   │   │   │   ├── EquipmentTable.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── EquipmentForm.tsx
│   │   │   │   └── Inventory.tsx
│   │   │   ├── Booking/
│   │   │   │   ├── BrowseEquipment.tsx
│   │   │   │   ├── CalibrationWarning.tsx
│   │   │   │   ├── BookingForm.tsx
│   │   │   │   ├── ReturnForm.tsx
│   │   │   │   ├── BookingHistory.tsx
│   │   │   │   └── Booking.tsx
│   │   │   ├── Calibration/
│   │   │   │   ├── CalibrationSchedule.tsx
│   │   │   │   ├── DueCountdown.tsx
│   │   │   │   ├── CalibrationForm.tsx
│   │   │   │   └── Calibration.tsx
│   │   │   ├── Learning/
│   │   │   │   ├── EquipmentCard.tsx
│   │   │   │   ├── ManualViewer.tsx
│   │   │   │   ├── SpecificationPanel.tsx
│   │   │   │   └── Learning.tsx
│   │   │   ├── Common/
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── LoadingSpinner.tsx
│   │   ├── pages/
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useEquipment.ts
│   │   │   └── useBooking.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   └── package.json
└── docker-compose.yml
```

---

## 🗄️ DATABASE SCHEMA

### Equipment Table
```sql
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100),
  instrument_name VARCHAR(255),
  brand VARCHAR(100),
  model VARCHAR(100),
  status VARCHAR(50) DEFAULT 'available', -- available, booked, maintenance
  industry_name VARCHAR(255),
  purchase_date DATE,
  last_calibration_date DATE,
  next_calibration_due DATE,
  calibration_interval_days INT DEFAULT 365,
  description TEXT,
  specifications JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Booking Table
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  equipment_id INT REFERENCES equipment(id),
  user_id INT REFERENCES users(id),
  booking_date TIMESTAMP,
  return_date TIMESTAMP,
  industry_name VARCHAR(255),
  purpose TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, returned, cancelled
  remarks TEXT,
  checked_out_by INT REFERENCES users(id),
  checked_in_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Calibration Table
```sql
CREATE TABLE calibration (
  id SERIAL PRIMARY KEY,
  equipment_id INT REFERENCES equipment(id),
  last_calibration_date DATE,
  next_due_date DATE,
  calibration_cycle_days INT DEFAULT 365,
  performed_by VARCHAR(100),
  certificate_path VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, in-progress, completed
  countdown_days INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'operator', -- operator, admin, technician, supervisor
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Learning Content Table
```sql
CREATE TABLE learning_content (
  id SERIAL PRIMARY KEY,
  equipment_id INT REFERENCES equipment(id),
  brand VARCHAR(100),
  model VARCHAR(100),
  product_overview TEXT,
  specifications JSONB,
  parameters_measured TEXT,
  accuracy VARCHAR(100),
  measurement_range VARCHAR(255),
  resolution VARCHAR(100),
  applications TEXT,
  operating_procedure TEXT,
  calibration_procedure TEXT,
  user_manual_path VARCHAR(255),
  product_image_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📁 FILE STORAGE STRUCTURE FOR MANUALS

**Base Location:** `backend/uploads/`

```
uploads/
├── manuals/
│   ├── PQF01/  (Serial Number)
│   │   └── manual.pdf
│   ├── PQF02/
│   │   └── manual.pdf
│   ├── PQH03/
│   │   └── manual.pdf
│   ├── PQK04/
│   │   └── manual.pdf
│   ├── PWH05/
│   │   └── manual.pdf
│   ├── PCH06/
│   │   └── manual.pdf
│   ├── PCK07/
│   │   └── manual.pdf
│   ├── PCH08/
│   │   └── manual.pdf
│   ├── PCK09/
│   │   └── manual.pdf
│   ├── UWA10/
│   │   └── manual.pdf
│   ├── UWF11/
│   │   └── manual.pdf
│   ├── AFV12/
│   │   └── manual.pdf
│   ├── ACF13/
│   │   └── manual.pdf
│   ├── ACF14/
│   │   └── manual.pdf
│   ├── FGK15/
│   │   └── manual.pdf
│   ├── FGT16/
│   │   └── manual.pdf
│   ├── VAF17/
│   │   └── manual.pdf
│   ├── VAF18/
│   │   └── manual.pdf
│   ├── TLT19/
│   │   └── manual.pdf
│   ├── LXF20/
│   │   └── manual.pdf
│   ├── LXF21/
│   │   └── manual.pdf
│   ├── STU22/
│   │   └── manual.pdf
│   ├── DTF23/
│   │   └── manual.pdf
│   ├── DTF24/
│   │   └── manual.pdf
│   ├── THT25/
│   │   └── manual.pdf
│   ├── THT26/
│   │   └── manual.pdf
│   ├── IAT27/
│   │   └── manual.pdf
│   └── DPT28/
│       └── manual.pdf
│
└── product-images/
    ├── PQF01.jpg
    ├── PQF02.jpg
    ├── PQH03.jpg
    ... (same pattern)
```

**⚠️ USER MANUAL STORAGE LOCATION:**
- **Upload your manuals to:** `backend/uploads/manuals/{SERIAL_NUMBER}/manual.pdf`
- **Example:** For Power Quality Analyzer (PQF01), save at: `backend/uploads/manuals/PQF01/manual.pdf`
- **All 28 equipment manuals should be stored using this serial number-based structure**

---

## 🎨 FOUR MAIN PANELS SPECIFICATIONS

### 1️⃣ DASHBOARD
**Purpose:** Overview & Quick Insights

**Features:**
- Total equipment count by status (Available/Booked/Maintenance)
- Calibration due count with visual warning (red)
- Equipment by industry breakdown (pie chart)
- Recent bookings list
- Upcoming calibrations (countdown timer)
- System health indicators

**UI Components:**
- Summary cards with icons
- Animated progress rings
- Real-time data updates
- Color coding: Green (Available), Yellow (Due Soon), Red (Overdue)

---

### 2️⃣ INVENTORY
**Purpose:** Complete Equipment Database Management

**Features:**
- Table view of all 28 equipment items
- Filters by: Category, Brand, Status, Industry
- Search by: Serial Number, Model, Instrument Name
- Add new equipment → Auto-create folder structure
- Edit equipment details
- Delete equipment (with soft-delete backup)
- Export inventory to CSV/Excel
- Bulk actions (mark as maintenance, update category)

**Actions Available (All 4 Users):**
- ✅ ADD: New equipment with auto-folder creation
- ✅ EDIT: Update all fields
- ✅ DELETE: Remove with soft-delete
- ✅ REMOVE: Hard delete (admin only)

---

### 3️⃣ BOOKING & RETURN
**Purpose:** Equipment Checkout/Checkin Management

**Features:**

**BOOKING Section:**
- Browse available equipment (with real-time availability)
- Filter by category, brand, availability status
- 🔴 Calibration Warning: Red flag if cal due within 7 days
- Booking form: Select equipment, industry, purpose, expected return date
- Availability check: Once booked → hidden from other users' list
- Generate Excel checkout sheet with:
  - Serial Number
  - Instrument Name
  - Model Number
  - Booking Date
  - Expected Return Date
  - User Name
  - Industry Name

**RETURN Section:**
- Show booked-out equipment for current user
- Return form with:
  - Actual return date
  - **Remarks section** (condition, any issues, observations)
  - Damage report (optional)
  - Signature/Confirmation
- Mark as returned
- Remarks visible in booking history

**Real-time Updates:**
- When equipment is booked → unavailable for others instantly
- When equipment is returned → available again instantly
- Multiple users see updated status immediately

---

### 4️⃣ CALIBRATION
**Purpose:** Track & Manage Calibration Cycles

**Features:**
- Table showing all equipment with calibration status
- Columns: Serial #, Equipment, Last Cal Date, Due Date, Countdown, Status, Technician
- 🔄 Countdown Timer: Real-time days-remaining display
- Status indicators: 
  - 🟢 Good (>30 days)
  - 🟡 Warning (7-30 days)
  - 🔴 Critical (<7 days or overdue)
- Calibration form:
  - Mark as calibrated
  - Set new due date
  - Assign technician/person (Person 1, 2, 3, or name)
  - Upload certificate
  - Add notes
- Auto-reset countdown when calibrated
- Real-time sync with Booking/Return page (greyed out if not compliant)

---

### 5️⃣ LEARNING CENTER
**Purpose:** Equipment Knowledge Base

**Features:**

**For Each Equipment (All 28 items):**
- Equipment card with product image
- Full specifications
- Parameters measured
- Accuracy & measurement range
- Operating procedure
- Calibration procedure
- **User Manual** (PDF viewer embedded)
- Search/filter by brand, model, category

**Knowledge Base Contents (Auto-fetched where possible):**
- ✅ Product Overview
- ✅ Specifications (JSONB stored)
- ✅ Parameters Measured
- ✅ Accuracy
- ✅ Measurement Range
- ✅ Resolution
- ✅ Applications
- ✅ Operating Procedure
- ✅ Calibration Procedure
- ✅ User Manual (manual upload)

**CRUD Operations:**
- ADD: New learning content
- EDIT: Update specifications, procedures
- DELETE: Remove content (soft-delete)
- All users can view, admins can edit

---

## 🔐 4 USER ROLES & PERMISSIONS

### Role 1: Operator
- **Can:** Book equipment, return equipment, view dashboard, view inventory
- **Cannot:** Add/edit equipment, manage calibration

### Role 2: Technician
- **Can:** All operator permissions + perform calibration, update calibration dates
- **Cannot:** Add/edit equipment master data

### Role 3: Supervisor
- **Can:** All technician permissions + add/edit/delete equipment, manage users
- **Cannot:** Modify system settings

### Role 4: Admin
- **Can:** Everything (full system access)

---

## ⚡ REAL-TIME SYNCHRONIZATION

**WebSocket Events (Socket.io):**

1. `equipment:added` → All clients refresh inventory
2. `equipment:updated` → Update specific equipment data
3. `equipment:deleted` → Remove from lists
4. `booking:created` → Update availability, notify all users
5. `booking:returned` → Mark as available, notify all users
6. `calibration:updated` → Update countdown timers across pages
7. `user:login` → Track active users
8. `user:logout` → Remove user session

**Backend Responsibilities:**
- Emit events on every CRUD operation
- Maintain real-time state synchronization
- Handle concurrent user conflicts
- Broadcast changes to all connected clients

---

## 📊 EQUIPMENT INVENTORY PRE-LOAD DATA

**28 Total Equipment Items:**

### Category: Power Quality Analyzer (4 items)
1. PQF01 - Fluke 1775
2. PQF02 - Fluke 1775
3. PQH03 - Hioki PQ3100
4. PQK04 - Krykard ALM36

### Category: Power Logger (1 item)
5. PWH05 - Hioki PW3360-20

### Category: Clamp Meter (4 items)
6. PCH06 - Hioki CM3286-50
7. PCK07 - Krykard F409
8. PCH08 - Hioki CM3286-50
9. PCK09 - Krykard F409

### Category: Ultrasonic Water Flow Meter (2 items)
10. UWA10 - Acron TR600H
11. UWF11 - Flexim F601

### Category: Air Flow Meter (1 item)
12. AFV12 - VPS VPS-R250-M100-D11-PN16

### Category: Acoustic Imager (2 items)
13. ACF13 - Fluke ii910
14. ACF14 - Fluke ii500

### Category: Flue Gas Analyzer (2 items)
15. FGK15 - Kane 958
16. FGT16 - Testo 340

### Category: Vane Anemometer (2 items)
17. VAF17 - Fluke 925
18. VAF18 - Fluke 925

### Category: Temperature Logger (1 item)
19. TLT19 - Testo 176T4

### Category: Lux Meter (2 items)
20. LXF20 - Fluke 941
21. LXF21 - Fluke 941

### Category: Steam Trap Tester (1 item)
22. STU22 - UE Systems 100-UP

### Category: Digital Tachometer (2 items)
23. DTF23 - Fluke 931
24. DTF24 - Fluke 931

### Category: Thermal Imager (2 items)
25. THT25 - Testo 872
26. THT26 - Testo 883

### Category: Indoor Air Quality Meter (1 item)
27. IAT27 - Testo IAQ Meter

### Category: Differential Pressure Logger & Pitot Tube (1 item)
28. DPT28 - Testo 510

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Backend Setup
- [ ] Initialize Node.js/Express project
- [ ] Setup PostgreSQL database
- [ ] Create tables with migrations
- [ ] Seed with 28 equipment items
- [ ] Setup authentication (JWT)
- [ ] Create REST API endpoints

### Phase 2: Backend Services
- [ ] Inventory service
- [ ] Booking service
- [ ] Calibration service
- [ ] Excel generation service
- [ ] WebSocket/Socket.io service
- [ ] Knowledge base service

### Phase 3: Frontend Setup
- [ ] Initialize React + TypeScript + Tailwind
- [ ] Setup routing (React Router)
- [ ] Setup WebSocket client
- [ ] Create layout & navigation

### Phase 4: Frontend - Dashboard
- [ ] Overview cards
- [ ] Charts (pie, bar)
- [ ] Real-time updates
- [ ] Filters

### Phase 5: Frontend - Inventory
- [ ] Equipment table
- [ ] Filters & search
- [ ] Add/Edit/Delete forms
- [ ] CRUD operations

### Phase 6: Frontend - Booking
- [ ] Browse equipment
- [ ] Booking form
- [ ] Return form with remarks
- [ ] Excel export
- [ ] Real-time availability

### Phase 7: Frontend - Calibration
- [ ] Calibration schedule
- [ ] Countdown timer
- [ ] Calibration form
- [ ] Real-time sync

### Phase 8: Frontend - Learning Center
- [ ] Equipment cards
- [ ] Manual viewer
- [ ] Specifications display
- [ ] Search/filters

### Phase 9: Real-time Sync & Testing
- [ ] WebSocket events
- [ ] Multi-user testing
- [ ] Concurrent booking tests
- [ ] Data consistency checks

### Phase 10: Deployment & Documentation
- [ ] Docker setup
- [ ] Deployment guide
- [ ] API documentation
- [ ] User manual

---

## 🎨 UI/UX SPECIFICATIONS

**Theme:** Light, Animated, Modern
- Primary Colors: Blue (#0066FF), White (#FFFFFF), Light Gray (#F5F7FA)
- Accent: Green (#00B74A), Yellow (#FFC107), Red (#FF3333)
- Font: Inter or Poppins
- Animation: Smooth transitions (0.3s ease)

**Components:**
- Animated cards with hover effects
- Smooth fade-in/out transitions
- Loading spinners with animation
- Toast notifications
- Modal dialogs with backdrop blur
- Responsive design (Mobile-first)

---

## 🚀 KEY FEATURES CHECKLIST

- [x] 4 Main panels (Dashboard, Inventory, Booking, Calibration, Learning)
- [x] 4 concurrent user support
- [x] Real-time synchronization (WebSocket)
- [x] CRUD operations for equipment
- [x] Booking/Return management
- [x] Calibration tracking with countdown
- [x] Excel generation on checkout
- [x] Remarks/notes tracking
- [x] Availability blocking system
- [x] Red flag warnings for due calibrations
- [x] Learning center with manuals
- [x] Auto file structure creation
- [x] Serial number-based manual storage
- [x] Light theme with animations
- [x] Multi-user conflict resolution

---

## 📞 SUPPORT & NEXT STEPS

1. **Prepare User Manuals:** Place each manual at `backend/uploads/manuals/{SERIAL_NUMBER}/manual.pdf`
2. **Setup Development Environment:** Node.js, PostgreSQL, npm
3. **Run Initial Setup:** Database migrations, seed data
4. **Test Multi-user Scenarios:** Concurrent bookings, simultaneous updates
5. **Deploy:** Docker or traditional server

---

**Last Updated:** 2026-06-24
**Version:** 1.0
**Status:** Ready for Implementation
