# BACKEND SETUP GUIDE
## Instrument Equipment Inventory Management System

---

## 📦 INSTALLATION & SETUP

### 1. Initialize Project
```bash
mkdir backend
cd backend
npm init -y
```

### 2. Install Dependencies
```bash
npm install express cors dotenv pg uuid
npm install socket.io socket.io-client
npm install bcryptjs jsonwebtoken
npm install exceljs multer
npm install nodemon --save-dev
npm install --save-dev typescript @types/express @types/node @types/pg
```

### 3. Create TypeScript Configuration
```bash
npx tsc --init
```

### 4. Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── environment.ts
│   ├── models/
│   │   ├── Equipment.ts
│   │   ├── Booking.ts
│   │   ├── Calibration.ts
│   │   ├── User.ts
│   │   └── LearningContent.ts
│   ├── routes/
│   │   ├── equipment.ts
│   │   ├── booking.ts
│   │   ├── calibration.ts
│   │   ├── learning.ts
│   │   ├── users.ts
│   │   └── auth.ts
│   ├── controllers/
│   │   ├── equipmentController.ts
│   │   ├── bookingController.ts
│   │   ├── calibrationController.ts
│   │   ├── learningController.ts
│   │   └── authController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   ├── services/
│   │   ├── inventoryService.ts
│   │   ├── calibrationService.ts
│   │   ├── bookingService.ts
│   │   ├── excelService.ts
│   │   ├── knowledgeService.ts
│   │   └── syncService.ts
│   ├── utils/
│   │   ├── fileManager.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   ├── database/
│   │   ├── init.ts
│   │   └── seeds/
│   │       └── seedInventory.ts
│   └── server.ts
├── uploads/
│   ├── manuals/
│   └── product-images/
├── .env
├── .env.example
└── package.json
```

---

## 🔧 CONFIGURATION FILES

### .env Example
```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d

# File Upload
MAX_FILE_SIZE=50000000
UPLOAD_DIR=./uploads

# Server
CORS_ORIGIN=http://localhost:3000
```

---

## 🗄️ DATABASE INITIALIZATION

### Create Database
```sql
CREATE DATABASE inventory_management;
```

### Initialize Tables (src/database/init.ts)
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export const initializeDatabase = async () => {
  try {
    // Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'operator',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        serial_number VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(100),
        instrument_name VARCHAR(255),
        brand VARCHAR(100),
        model VARCHAR(100),
        status VARCHAR(50) DEFAULT 'available',
        industry_name VARCHAR(255),
        purchase_date DATE,
        last_calibration_date DATE,
        next_calibration_due DATE,
        calibration_interval_days INT DEFAULT 365,
        description TEXT,
        specifications JSONB,
        manual_path VARCHAR(255),
        image_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bookings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        user_id INT REFERENCES users(id),
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        return_date TIMESTAMP,
        industry_name VARCHAR(255),
        purpose TEXT,
        status VARCHAR(50) DEFAULT 'active',
        remarks TEXT,
        checked_out_by INT REFERENCES users(id),
        checked_in_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Calibration Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calibration (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        last_calibration_date DATE,
        next_due_date DATE,
        calibration_cycle_days INT DEFAULT 365,
        performed_by VARCHAR(100),
        certificate_path VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        countdown_days INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Learning Content Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_content (
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
      )
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

export default pool;
```

---

## 🌱 SEED DATA (28 Equipment Items)

### src/database/seeds/seedInventory.ts
```typescript
import pool from '../init';

const equipmentData = [
  // Power Quality Analyzer
  { category: 'Power Quality Analyzer', instrument_name: 'Power Quality Analyzer', brand: 'Fluke', model: 'Fluke 1775', serial_number: 'PQF01' },
  { category: 'Power Quality Analyzer', instrument_name: 'Power Quality Analyzer', brand: 'Fluke', model: 'Fluke 1775', serial_number: 'PQF02' },
  { category: 'Power Quality Analyzer', instrument_name: 'Power Quality Analyzer', brand: 'Hioki', model: 'Hioki PQ3100', serial_number: 'PQH03' },
  { category: 'Power Quality Analyzer', instrument_name: 'Power Quality Analyzer', brand: 'Krykard', model: 'Krykard ALM36', serial_number: 'PQK04' },
  
  // Power Logger
  { category: 'Power Logger', instrument_name: 'Power Logger', brand: 'Hioki', model: 'Hioki PW3360-20', serial_number: 'PWH05' },
  
  // Clamp Meter
  { category: 'Clamp Meter', instrument_name: 'Clamp Meter', brand: 'Hioki', model: 'Hioki CM3286-50', serial_number: 'PCH06' },
  { category: 'Clamp Meter', instrument_name: 'Clamp Meter', brand: 'Krykard', model: 'Krykard F409', serial_number: 'PCK07' },
  { category: 'Clamp Meter', instrument_name: 'Clamp Meter', brand: 'Hioki', model: 'Hioki CM3286-50', serial_number: 'PCH08' },
  { category: 'Clamp Meter', instrument_name: 'Clamp Meter', brand: 'Krykard', model: 'Krykard F409', serial_number: 'PCK09' },
  
  // Ultrasonic Water Flow Meter
  { category: 'Ultrasonic Water Flow Meter', instrument_name: 'Ultrasonic Water Flow Meter', brand: 'Acron', model: 'TR600H', serial_number: 'UWA10' },
  { category: 'Ultrasonic Water Flow Meter', instrument_name: 'Ultrasonic Water Flow Meter', brand: 'Flexim', model: 'F601', serial_number: 'UWF11' },
  
  // Air Flow Meter
  { category: 'Air Flow Meter', instrument_name: 'Air Flow Meter', brand: 'VPS', model: 'VPS-R250-M100-D11-PN16', serial_number: 'AFV12' },
  
  // Acoustic Imager
  { category: 'Acoustic Imager', instrument_name: 'Acoustic Imager', brand: 'Fluke', model: 'ii910', serial_number: 'ACF13' },
  { category: 'Acoustic Imager', instrument_name: 'Acoustic Imager', brand: 'Fluke', model: 'ii500', serial_number: 'ACF14' },
  
  // Flue Gas Analyzer
  { category: 'Flue Gas Analyzer', instrument_name: 'Flue Gas Analyzer', brand: 'Kane', model: '958', serial_number: 'FGK15' },
  { category: 'Flue Gas Analyzer', instrument_name: 'Flue Gas Analyzer', brand: 'Testo', model: '340', serial_number: 'FGT16' },
  
  // Vane Anemometer
  { category: 'Vane Anemometer', instrument_name: 'Vane Anemometer', brand: 'Fluke', model: '925', serial_number: 'VAF17' },
  { category: 'Vane Anemometer', instrument_name: 'Vane Anemometer', brand: 'Fluke', model: '925', serial_number: 'VAF18' },
  
  // Temperature Logger
  { category: 'Temperature Logger', instrument_name: 'Temperature Logger', brand: 'Testo', model: '176T4', serial_number: 'TLT19' },
  
  // Lux Meter
  { category: 'Lux Meter', instrument_name: 'Lux Meter', brand: 'Fluke', model: '941', serial_number: 'LXF20' },
  { category: 'Lux Meter', instrument_name: 'Lux Meter', brand: 'Fluke', model: '941', serial_number: 'LXF21' },
  
  // Steam Trap Tester
  { category: 'Steam Trap Tester', instrument_name: 'Steam Trap Tester', brand: 'UE Systems', model: '100-UP', serial_number: 'STU22' },
  
  // Digital Tachometer
  { category: 'Digital Tachometer', instrument_name: 'Digital Tachometer', brand: 'Fluke', model: '931', serial_number: 'DTF23' },
  { category: 'Digital Tachometer', instrument_name: 'Digital Tachometer', brand: 'Fluke', model: '931', serial_number: 'DTF24' },
  
  // Thermal Imager
  { category: 'Thermal Imager', instrument_name: 'Thermal Imager', brand: 'Testo', model: '872', serial_number: 'THT25' },
  { category: 'Thermal Imager', instrument_name: 'Thermal Imager', brand: 'Testo', model: '883', serial_number: 'THT26' },
  
  // Indoor Air Quality Meter
  { category: 'Indoor Air Quality Meter', instrument_name: 'Indoor Air Quality Meter', brand: 'Testo', model: 'IAQ Meter', serial_number: 'IAT27' },
  
  // Differential Pressure Logger & Pitot Tube
  { category: 'Differential Pressure Logger & Pitot Tube', instrument_name: 'Differential Pressure Logger & Pitot Tube', brand: 'Testo', model: '510', serial_number: 'DPT28' },
];

export const seedEquipment = async () => {
  try {
    for (const equipment of equipmentData) {
      const nextCalDate = new Date();
      nextCalDate.setDate(nextCalDate.getDate() + 365);
      
      await pool.query(
        `INSERT INTO equipment (category, instrument_name, brand, model, serial_number, status, next_calibration_due)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (serial_number) DO NOTHING`,
        [equipment.category, equipment.instrument_name, equipment.brand, equipment.model, equipment.serial_number, 'available', nextCalDate]
      );
    }
    console.log('✅ Equipment seeded successfully');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
};
```

---

## 📁 FILE MANAGEMENT SERVICE

### src/utils/fileManager.ts
```typescript
import fs from 'fs';
import path from 'path';

export class FileManager {
  static readonly UPLOAD_BASE = process.env.UPLOAD_DIR || './uploads';
  static readonly MANUALS_DIR = path.join(this.UPLOAD_BASE, 'manuals');
  static readonly IMAGES_DIR = path.join(this.UPLOAD_BASE, 'product-images');

  static ensureDirectories() {
    const dirs = [this.MANUALS_DIR, this.IMAGES_DIR];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  static createSerialNumberDirectory(serialNumber: string): string {
    const dir = path.join(this.MANUALS_DIR, serialNumber);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static getManualPath(serialNumber: string): string {
    return path.join(this.MANUALS_DIR, serialNumber, 'manual.pdf');
  }

  static getImagePath(serialNumber: string): string {
    return path.join(this.IMAGES_DIR, `${serialNumber}.jpg`);
  }

  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static deleteFile(filePath: string): void {
    if (this.fileExists(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
```

---

## 🔐 AUTHENTICATION SERVICE

### src/middleware/auth.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = user.id;
    req.userRole = user.role;
    next();
  });
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

---

## 📊 EXCEL GENERATION SERVICE

### src/services/excelService.ts
```typescript
import ExcelJS from 'exceljs';
import path from 'path';

export class ExcelService {
  static async generateCheckoutSheet(bookings: any[]): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Checkout Sheet');

    // Headers
    worksheet.columns = [
      { header: 'Serial Number', key: 'serial_number', width: 15 },
      { header: 'Instrument Name', key: 'instrument_name', width: 25 },
      { header: 'Brand', key: 'brand', width: 15 },
      { header: 'Model', key: 'model', width: 20 },
      { header: 'Booking Date', key: 'booking_date', width: 15 },
      { header: 'Expected Return', key: 'return_date', width: 15 },
      { header: 'Industry', key: 'industry_name', width: 20 },
      { header: 'User', key: 'user_name', width: 15 },
      { header: 'Purpose', key: 'purpose', width: 25 },
    ];

    // Add data
    bookings.forEach(booking => {
      worksheet.addRow({
        serial_number: booking.serial_number,
        instrument_name: booking.instrument_name,
        brand: booking.brand,
        model: booking.model,
        booking_date: new Date(booking.booking_date).toLocaleDateString(),
        return_date: new Date(booking.return_date).toLocaleDateString(),
        industry_name: booking.industry_name,
        user_name: booking.user_name,
        purpose: booking.purpose,
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066FF' } };

    const filePath = path.join(process.env.UPLOAD_DIR!, 'checkout-' + Date.now() + '.xlsx');
    await workbook.xlsx.writeFile(filePath);

    return filePath;
  }
}
```

---

## 🔄 WEBSOCKET SERVICE (Real-time Sync)

### src/services/syncService.ts
```typescript
import { Server, Socket } from 'socket.io';

export class SyncService {
  private io: Server;
  private activeUsers: Map<string, number> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  registerHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      socket.on('user:login', (userId: number) => {
        this.activeUsers.set(socket.id, userId);
        this.io.emit('users:update', {
          activeCount: this.activeUsers.size,
          users: Array.from(this.activeUsers.values())
        });
      });

      socket.on('disconnect', () => {
        this.activeUsers.delete(socket.id);
        this.io.emit('users:update', {
          activeCount: this.activeUsers.size,
        });
        console.log(`👤 User disconnected: ${socket.id}`);
      });
    });
  }

  emitEquipmentUpdate(event: string, data: any) {
    this.io.emit(`equipment:${event}`, data);
  }

  emitBookingUpdate(event: string, data: any) {
    this.io.emit(`booking:${event}`, data);
  }

  emitCalibrationUpdate(event: string, data: any) {
    this.io.emit(`calibration:${event}`, data);
  }
}
```

---

## ⚙️ SERVER INITIALIZATION

### src/server.ts
```typescript
import express, { Express } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init';
import { seedEquipment } from './database/seeds/seedInventory';
import { FileManager } from './utils/fileManager';
import { SyncService } from './services/syncService';

dotenv.config();

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Initialize services
FileManager.ensureDirectories();
const syncService = new SyncService(io);
syncService.registerHandlers();

// Routes (to be added)
// app.use('/api/auth', authRoutes);
// app.use('/api/equipment', equipmentRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/calibration', calibrationRoutes);
// app.use('/api/learning', learningRoutes);

// Initialize Database
async function startServer() {
  try {
    await initializeDatabase();
    await seedEquipment();

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io };
```

---

## 📝 PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "seed": "ts-node src/database/seeds/seedInventory.ts"
  }
}
```

---

## ✅ BACKEND CHECKLIST

- [ ] Node.js project initialized
- [ ] Dependencies installed
- [ ] TypeScript configured
- [ ] .env file created
- [ ] PostgreSQL database created
- [ ] Tables initialized
- [ ] 28 equipment items seeded
- [ ] File manager configured
- [ ] Auth middleware setup
- [ ] WebSocket configured
- [ ] Excel service ready
- [ ] Server starts without errors
- [ ] Database connection verified

---

**Next:** Proceed to FRONTEND_SETUP.md
