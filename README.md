# INSTRUMENT EQUIPMENT INVENTORY MANAGEMENT SYSTEM
## Complete Implementation Guide & Quick Start

---

## 📋 OVERVIEW

A comprehensive real-time Instrument Equipment Inventory Management System for managing 28 pieces of test & measurement equipment across multiple categories with live synchronization for 4 concurrent users.

**Project Location:** `d:\inten\IITM IEAS KISEM\New assest management\`

---

## 📚 DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| **MASTER_PROMPT.md** | Complete system overview, requirements, and architecture |
| **BACKEND_SETUP.md** | Backend installation, database setup, and service configuration |
| **FRONTEND_SETUP.md** | Frontend setup, components, and UI implementation |
| **FILE_STRUCTURE_MANUAL_STORAGE.md** | ⭐ **User manual storage location and setup** |

---

## ⭐ USER MANUAL STORAGE (IMPORTANT)

### Where to Save Your Manuals

**Location:** `backend/uploads/manuals/{SERIAL_NUMBER}/manual.pdf`

**All 28 Manuals Storage Paths:**
```
backend/uploads/manuals/PQF01/manual.pdf    → Fluke 1775
backend/uploads/manuals/PQF02/manual.pdf    → Fluke 1775
backend/uploads/manuals/PQH03/manual.pdf    → Hioki PQ3100
backend/uploads/manuals/PQK04/manual.pdf    → Krykard ALM36
backend/uploads/manuals/PWH05/manual.pdf    → Hioki PW3360-20
backend/uploads/manuals/PCH06/manual.pdf    → Hioki CM3286-50
backend/uploads/manuals/PCK07/manual.pdf    → Krykard F409
backend/uploads/manuals/PCH08/manual.pdf    → Hioki CM3286-50
backend/uploads/manuals/PCK09/manual.pdf    → Krykard F409
backend/uploads/manuals/UWA10/manual.pdf    → Acron TR600H
backend/uploads/manuals/UWF11/manual.pdf    → Flexim F601
backend/uploads/manuals/AFV12/manual.pdf    → VPS VPS-R250-M100-D11-PN16
backend/uploads/manuals/ACF13/manual.pdf    → Fluke ii910
backend/uploads/manuals/ACF14/manual.pdf    → Fluke ii500
backend/uploads/manuals/FGK15/manual.pdf    → Kane 958
backend/uploads/manuals/FGT16/manual.pdf    → Testo 340
backend/uploads/manuals/VAF17/manual.pdf    → Fluke 925
backend/uploads/manuals/VAF18/manual.pdf    → Fluke 925
backend/uploads/manuals/TLT19/manual.pdf    → Testo 176T4
backend/uploads/manuals/LXF20/manual.pdf    → Fluke 941
backend/uploads/manuals/LXF21/manual.pdf    → Fluke 941
backend/uploads/manuals/STU22/manual.pdf    → UE Systems 100-UP
backend/uploads/manuals/DTF23/manual.pdf    → Fluke 931
backend/uploads/manuals/DTF24/manual.pdf    → Fluke 931
backend/uploads/manuals/THT25/manual.pdf    → Testo 872
backend/uploads/manuals/THT26/manual.pdf    → Testo 883
backend/uploads/manuals/IAT27/manual.pdf    → Testo IAQ Meter
backend/uploads/manuals/DPT28/manual.pdf    → Testo 510
```

**👉 See FILE_STRUCTURE_MANUAL_STORAGE.md for detailed instructions**

---

## 🚀 QUICK START GUIDE

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn
- Windows/Mac/Linux

### Step 1: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
# (Copy .env.example and update database credentials)

# Initialize database
npm run seed

# Start backend server
npm run dev
```

**Expected Output:**
```
✅ Database tables created successfully
✅ Equipment seeded successfully
🚀 Server running on port 5000
```

### Step 2: Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 3: Access Application

**Frontend:** http://localhost:3000 or http://localhost:5173
**Backend API:** http://localhost:5000/api
**WebSocket:** ws://localhost:5000

---

## 🔐 DEFAULT LOGIN CREDENTIALS

Four users are pre-configured for testing:

| Role | Username | Password | Permissions |
|------|----------|----------|-------------|
| Operator | operator1 | demo123 | Book/Return Equipment, View Dashboard |
| Technician | technician1 | demo123 | Perform Calibration + Operator Permissions |
| Supervisor | supervisor1 | demo123 | Manage Equipment + Technician Permissions |
| Admin | admin1 | demo123 | Full System Access |

---

## 🎯 FIVE MAIN MODULES

### 1. 📊 DASHBOARD
- **Overview Cards:** Total equipment, available, booked, maintenance, calibration due
- **Real-time Charts:** Equipment status, industry breakdown
- **Quick Stats:** Equipment status by category
- **Recent Activity:** Last 10 bookings/returns

### 2. 📦 INVENTORY
- **Complete Equipment List:** All 28 items with details
- **Filters:** Category, brand, status, industry
- **Search:** Serial number, model, instrument name
- **CRUD Operations:** Add, edit, delete equipment
- **Bulk Actions:** Update status, export data
- **All 4 users can perform operations**

### 3. 📋 BOOKING & RETURN
- **Browse Equipment:** Filter available items with real-time availability
- **🔴 Calibration Warning:** Red flag if calibration due within 7 days
- **Book Equipment:** Select, fill details, confirm booking
- **Excel Export:** Auto-generate checkout sheet with:
  - Serial Number, Instrument Name, Brand, Model
  - Booking Date, Expected Return Date
  - Industry Name, User Name, Purpose
- **Return Equipment:** Mark as returned with remarks section
- **Real-time Sync:** Booked items immediately unavailable for others

### 4. ⚡ CALIBRATION
- **Schedule View:** All equipment with calibration status
- **Countdown Timer:** Real-time days remaining
- **Status Indicators:** 
  - 🟢 Green (>30 days)
  - 🟡 Yellow (7-30 days)
  - 🔴 Red (<7 days or overdue)
- **Update Calibration:** Mark as done, set new due date
- **Technician Assignment:** Person 1, 2, 3, or custom name
- **Real-time Sync:** Updates immediately across all pages

### 5. 📖 LEARNING CENTER
- **Equipment Knowledge Base:** All 28 items
- **For Each Equipment:**
  - Product overview & images
  - Specifications & parameters measured
  - Accuracy & measurement range
  - Operating procedure
  - Calibration procedure
  - **User manual** (PDF viewer)
- **Search/Filter:** By brand, model, category
- **CRUD:** Add, edit, delete learning content

---

## 🔄 REAL-TIME SYNCHRONIZATION

**WebSocket Events (Socket.io):**

```
EQUIPMENT:
├── equipment:added      → Equipment added to inventory
├── equipment:updated    → Equipment details changed
└── equipment:deleted    → Equipment removed

BOOKING:
├── booking:created      → Equipment booked
├── booking:returned     → Equipment returned
└── booking:cancelled    → Booking cancelled

CALIBRATION:
├── calibration:updated  → Calibration date changed
└── calibration:completed → Calibration finished

USER:
├── users:update         → Active user count changed
└── user:notification    → Important alerts
```

**All 4 concurrent users see updates instantly.**

---

## 🗄️ DATABASE SCHEMA

### Equipment Table (28 items pre-loaded)
```
id, serial_number, category, instrument_name, brand, model,
status, industry_name, purchase_date, last_calibration_date,
next_calibration_due, calibration_interval_days, description,
specifications, manual_path, image_path, created_at, updated_at
```

### Bookings Table
```
id, equipment_id, user_id, booking_date, return_date,
industry_name, purpose, status, remarks, checked_out_by,
checked_in_by, created_at, updated_at
```

### Calibration Table
```
id, equipment_id, last_calibration_date, next_due_date,
calibration_cycle_days, performed_by, certificate_path,
status, countdown_days, created_at, updated_at
```

### Users Table (4 pre-configured)
```
id, username, email, password_hash, role, status, created_at, updated_at
```

### Learning Content Table
```
id, equipment_id, brand, model, product_overview, specifications,
parameters_measured, accuracy, measurement_range, resolution,
applications, operating_procedure, calibration_procedure,
user_manual_path, product_image_path, created_at, updated_at
```

---

## 🎨 UI/UX FEATURES

### Design
- **Theme:** Light, clean, animated modern interface
- **Colors:** Primary Blue (#0066FF), Success Green (#00B74A), Warning Yellow (#FFC107), Error Red (#FF3333)
- **Animation:** Smooth 0.3s transitions, fade-in effects, hover animations
- **Responsive:** Mobile-first, works on all devices

### Components
- Animated cards with hover effects
- Smooth modal dialogs with backdrop blur
- Real-time countdown timers with animations
- Interactive charts (Recharts)
- Embedded PDF viewer (react-pdf)
- Toast notifications
- Loading spinners
- Custom scrollbars

---

## 📊 28 EQUIPMENT INVENTORY

**Pre-loaded with complete details:**

### Power Quality Analyzer (4)
- PQF01: Fluke 1775
- PQF02: Fluke 1775
- PQH03: Hioki PQ3100
- PQK04: Krykard ALM36

### Power Logger (1)
- PWH05: Hioki PW3360-20

### Clamp Meter (4)
- PCH06: Hioki CM3286-50
- PCK07: Krykard F409
- PCH08: Hioki CM3286-50
- PCK09: Krykard F409

### Ultrasonic Water Flow Meter (2)
- UWA10: Acron TR600H
- UWF11: Flexim F601

### Air Flow Meter (1)
- AFV12: VPS VPS-R250-M100-D11-PN16

### Acoustic Imager (2)
- ACF13: Fluke ii910
- ACF14: Fluke ii500

### Flue Gas Analyzer (2)
- FGK15: Kane 958
- FGT16: Testo 340

### Vane Anemometer (2)
- VAF17: Fluke 925
- VAF18: Fluke 925

### Temperature Logger (1)
- TLT19: Testo 176T4

### Lux Meter (2)
- LXF20: Fluke 941
- LXF21: Fluke 941

### Steam Trap Tester (1)
- STU22: UE Systems 100-UP

### Digital Tachometer (2)
- DTF23: Fluke 931
- DTF24: Fluke 931

### Thermal Imager (2)
- THT25: Testo 872
- THT26: Testo 883

### Indoor Air Quality Meter (1)
- IAT27: Testo IAQ Meter

### Differential Pressure Logger & Pitot Tube (1)
- DPT28: Testo 510

---

## ✅ FEATURES CHECKLIST

**Core Functionality:**
- ✅ 4 Main Panels (Dashboard, Inventory, Booking, Calibration, Learning)
- ✅ 5 User roles with role-based access control
- ✅ 28 Pre-loaded equipment items
- ✅ Real-time synchronization (WebSocket)
- ✅ CRUD operations for all modules
- ✅ Multi-user conflict resolution

**Booking & Return:**
- ✅ Browse available equipment
- ✅ Calibration warning (red flag)
- ✅ Book equipment with industry/purpose
- ✅ Real-time availability updates
- ✅ Excel checkout sheet generation
- ✅ Return with remarks section
- ✅ Booking history

**Calibration:**
- ✅ Due date tracking
- ✅ Real-time countdown timer
- ✅ Status indicators (Green/Yellow/Red)
- ✅ Update calibration cycles
- ✅ Technician assignment
- ✅ Sync with booking page

**Learning Center:**
- ✅ Product knowledge base
- ✅ Equipment specifications
- ✅ Operating procedures
- ✅ Embedded PDF viewer
- ✅ Search & filter
- ✅ CRUD operations

**UI/UX:**
- ✅ Light theme, animated interface
- ✅ Responsive design
- ✅ Real-time data updates
- ✅ Smooth transitions
- ✅ Toast notifications
- ✅ Loading indicators

**Data Management:**
- ✅ Serial number-based manual storage
- ✅ Auto folder creation
- ✅ Product image storage
- ✅ Excel export/import
- ✅ Data validation
- ✅ Error handling

---

## 🔧 TROUBLESHOOTING

### Database Connection Error
```
Solution: Check .env credentials, ensure PostgreSQL is running
psql -U postgres -d inventory_management
```

### WebSocket Connection Failed
```
Solution: Ensure backend is running on port 5000
Check CORS_ORIGIN in .env matches frontend URL
```

### Manual Not Loading
```
Solution: Verify file at backend/uploads/manuals/{SERIAL}/manual.pdf exists
Check manual_path in database: SELECT manual_path FROM equipment;
```

### React Component Not Updating
```
Solution: Verify WebSocket connection
Check browser console for errors
Refresh page or check socket.io connection status
```

### Booking Not Available for Another User
```
Solution: This is intentional - booked items are hidden from other users
Returns will make it available again immediately
```

---

## 📦 DEPLOYMENT

### Docker Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: inventory_management
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - postgres
    environment:
      DB_HOST: postgres
      DB_PORT: 5432

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Run with:**
```bash
docker-compose up
```

---

## 📱 MULTI-USER TESTING SCENARIOS

### Scenario 1: Simultaneous Booking
1. User A books Equipment X
2. User B tries to book same Equipment
3. ✅ User B sees it's unavailable (real-time)

### Scenario 2: Return & Rebooking
1. User A returns Equipment X with remarks
2. User B can now book Equipment X
3. ✅ Availability updated instantly

### Scenario 3: Calibration Sync
1. Technician updates calibration date for Equipment Y
2. Dashboard shows updated countdown
3. Booking page shows updated warning status
4. ✅ All users see changes immediately

### Scenario 4: CRUD Across Users
1. Admin adds new equipment
2. All other users see it instantly in Inventory
3. Can book, view, or edit
4. ✅ Real-time synchronization works

---

## 📞 API ENDPOINTS

```
AUTH:
POST   /api/auth/login

EQUIPMENT:
GET    /api/equipment
POST   /api/equipment
PUT    /api/equipment/{id}
DELETE /api/equipment/{id}

BOOKINGS:
GET    /api/bookings
POST   /api/bookings
POST   /api/bookings/{id}/return
GET    /api/bookings/{id}

CALIBRATION:
GET    /api/calibration
PUT    /api/calibration/{id}
GET    /api/calibration/{id}

LEARNING:
GET    /api/learning
GET    /api/learning/{equipmentId}
POST   /api/learning
PUT    /api/learning/{id}

REPORTS:
POST   /api/reports/checkout
GET    /api/reports/inventory
```

---

## 🎓 LEARNING RESOURCES

Refer to the documentation files for:
- Detailed architecture overview (MASTER_PROMPT.md)
- Backend API implementation (BACKEND_SETUP.md)
- Frontend component structure (FRONTEND_SETUP.md)
- File management & manual storage (FILE_STRUCTURE_MANUAL_STORAGE.md)

---

## 📝 NOTES

- All 4 users can perform CRUD operations based on their role
- Real-time sync prevents booking conflicts
- Calibration reminders appear 7 days before due date
- Manuals are stored by serial number for easy access
- Excel reports can be generated for auditing
- System maintains complete booking history
- Soft-delete implemented for data recovery

---

## 🎯 NEXT STEPS

1. **Setup Manual Storage:** See FILE_STRUCTURE_MANUAL_STORAGE.md
2. **Install Backend:** See BACKEND_SETUP.md
3. **Install Frontend:** See FRONTEND_SETUP.md
4. **Test Scenarios:** Use 4 different browsers/users
5. **Verify Real-time Sync:** Test concurrent operations
6. **Deploy:** Use docker-compose or traditional hosting

---

**Status:** ✅ Ready for Implementation
**Version:** 1.0
**Last Updated:** 2026-06-24

