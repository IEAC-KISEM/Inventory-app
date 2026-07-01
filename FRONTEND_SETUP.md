# FRONTEND SETUP GUIDE
## Instrument Equipment Inventory Management System

---

## 📦 INSTALLATION & SETUP

### 1. Create React Project
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### 2. Install Dependencies
```bash
npm install react-router-dom
npm install socket.io-client
npm install axios
npm install @tanstack/react-query
npm install zustand
npm install framer-motion
npm install react-icons
npm install date-fns
npm install exceljs
npm install recharts
npm install lucide-react
npm install pdfjs-dist
npm install tailwind-css autoprefixer postcss
npm install -D tailwindcss postcss autoprefixer
```

### 3. Configure Tailwind CSS
```bash
npx tailwindcss init -p
```

### 4. Project Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── OverviewCard.tsx
│   │   │   ├── CalibrationChart.tsx
│   │   │   ├── IndustryBreakdown.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── Inventory/
│   │   │   ├── EquipmentTable.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── EquipmentModal.tsx
│   │   │   └── Inventory.tsx
│   │   ├── Booking/
│   │   │   ├── BrowseEquipment.tsx
│   │   │   ├── BookingForm.tsx
│   │   │   ├── ReturnForm.tsx
│   │   │   ├── BookingHistory.tsx
│   │   │   └── Booking.tsx
│   │   ├── Calibration/
│   │   │   ├── CalibrationSchedule.tsx
│   │   │   ├── DueCountdown.tsx
│   │   │   ├── CalibrationForm.tsx
│   │   │   └── Calibration.tsx
│   │   ├── Learning/
│   │   │   ├── EquipmentCard.tsx
│   │   │   ├── ManualViewer.tsx
│   │   │   ├── SpecificationPanel.tsx
│   │   │   └── Learning.tsx
│   │   ├── Common/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useEquipment.ts
│   │   ├── useBooking.ts
│   │   └── useAuth.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── socket.ts
│   │   └── storage.ts
│   ├── store/
│   │   ├── equipmentStore.ts
│   │   ├── bookingStore.ts
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── BookingPage.tsx
│   │   ├── CalibrationPage.tsx
│   │   └── LearningPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── vite.env.d.ts
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 🎨 TAILWIND CONFIGURATION

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0066FF',
        secondary: '#F5F7FA',
        success: '#00B74A',
        warning: '#FFC107',
        danger: '#FF3333',
        dark: '#1F2937',
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-in-out',
        fadeIn: 'fadeIn 0.3s ease-in-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

### src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f7fa;
  font-family: 'Inter', 'Poppins', sans-serif;
  color: #1f2937;
}

/* Custom animations */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.pulse-soft {
  animation: pulse-soft 2s ease-in-out infinite;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

---

## 📝 TYPE DEFINITIONS

### src/types/index.ts
```typescript
export interface Equipment {
  id: number;
  serial_number: string;
  category: string;
  instrument_name: string;
  brand: string;
  model: string;
  status: 'available' | 'booked' | 'maintenance';
  industry_name?: string;
  purchase_date?: string;
  last_calibration_date?: string;
  next_calibration_due: string;
  calibration_interval_days: number;
  description?: string;
  specifications?: any;
  manual_path?: string;
  image_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  equipment_id: number;
  user_id: number;
  booking_date: string;
  return_date?: string;
  industry_name: string;
  purpose?: string;
  status: 'active' | 'returned' | 'cancelled';
  remarks?: string;
  checked_out_by?: number;
  checked_in_by?: number;
  created_at: string;
  updated_at: string;
}

export interface Calibration {
  id: number;
  equipment_id: number;
  last_calibration_date: string;
  next_due_date: string;
  calibration_cycle_days: number;
  performed_by?: string;
  certificate_path?: string;
  status: 'pending' | 'in-progress' | 'completed';
  countdown_days: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'operator' | 'technician' | 'supervisor' | 'admin';
  status: 'active' | 'inactive';
  created_at: string;
}

export interface LearningContent {
  id: number;
  equipment_id: number;
  brand: string;
  model: string;
  product_overview?: string;
  specifications?: any;
  parameters_measured?: string;
  accuracy?: string;
  measurement_range?: string;
  resolution?: string;
  applications?: string;
  operating_procedure?: string;
  calibration_procedure?: string;
  user_manual_path?: string;
  product_image_path?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

---

## 🔌 API SERVICE

### src/services/api.ts
```typescript
import axios, { AxiosInstance } from 'axios';
import { AuthResponse, Equipment, Booking, Calibration } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use(config => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Auth
  async login(username: string, password: string): Promise<AuthResponse> {
    const { data } = await this.api.post('/auth/login', { username, password });
    return data;
  }

  // Equipment
  async getEquipment(): Promise<Equipment[]> {
    const { data } = await this.api.get('/equipment');
    return data;
  }

  async addEquipment(equipment: Partial<Equipment>): Promise<Equipment> {
    const { data } = await this.api.post('/equipment', equipment);
    return data;
  }

  async updateEquipment(id: number, equipment: Partial<Equipment>): Promise<Equipment> {
    const { data } = await this.api.put(`/equipment/${id}`, equipment);
    return data;
  }

  async deleteEquipment(id: number): Promise<void> {
    await this.api.delete(`/equipment/${id}`);
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const { data } = await this.api.get('/bookings');
    return data;
  }

  async createBooking(booking: Partial<Booking>): Promise<Booking> {
    const { data } = await this.api.post('/bookings', booking);
    return data;
  }

  async returnEquipment(bookingId: number, remarks: string): Promise<void> {
    await this.api.post(`/bookings/${bookingId}/return`, { remarks });
  }

  // Calibration
  async getCalibration(): Promise<Calibration[]> {
    const { data } = await this.api.get('/calibration');
    return data;
  }

  async updateCalibration(id: number, calibration: Partial<Calibration>): Promise<Calibration> {
    const { data } = await this.api.put(`/calibration/${id}`, calibration);
    return data;
  }

  async generateCheckout(bookingIds: number[]): Promise<Blob> {
    const { data } = await this.api.post('/reports/checkout', { bookingIds }, {
      responseType: 'blob'
    });
    return data;
  }
}

export const apiService = new ApiService();
```

---

## 🔄 WEBSOCKET SERVICE

### src/services/socket.ts
```typescript
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const emitEvent = (event: string, data: any) => {
  if (socket) {
    socket.emit(event, data);
  }
};

export const onEvent = (event: string, callback: (data: any) => void) => {
  if (socket) {
    socket.on(event, callback);
  }
};

export const offEvent = (event: string) => {
  if (socket) {
    socket.off(event);
  }
};
```

---

## 🏪 STATE MANAGEMENT (Zustand)

### src/store/equipmentStore.ts
```typescript
import { create } from 'zustand';
import { Equipment } from '../types';

interface EquipmentStore {
  equipment: Equipment[];
  loading: boolean;
  error: string | null;
  setEquipment: (equipment: Equipment[]) => void;
  addEquipment: (item: Equipment) => void;
  updateEquipment: (id: number, item: Equipment) => void;
  deleteEquipment: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEquipmentStore = create<EquipmentStore>((set) => ({
  equipment: [],
  loading: false,
  error: null,
  setEquipment: (equipment) => set({ equipment }),
  addEquipment: (item) => set((state) => ({ equipment: [...state.equipment, item] })),
  updateEquipment: (id, item) => set((state) => ({
    equipment: state.equipment.map(e => e.id === id ? item : e)
  })),
  deleteEquipment: (id) => set((state) => ({
    equipment: state.equipment.filter(e => e.id !== id)
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
```

### src/store/authStore.ts
```typescript
import { create } from 'zustand';
import { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => {
    localStorage.setItem('authToken', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('authToken');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
```

---

## 🪝 CUSTOM HOOKS

### src/hooks/useWebSocket.ts
```typescript
import { useEffect, useCallback } from 'react';
import { initSocket, onEvent, offEvent } from '../services/socket';

export const useWebSocket = (event: string, callback: (data: any) => void) => {
  useEffect(() => {
    const socket = initSocket();
    
    onEvent(event, callback);

    return () => {
      offEvent(event);
    };
  }, [event, callback]);
};
```

### src/hooks/useAuth.ts
```typescript
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';

export const useAuth = () => {
  const { setAuth, logout } = useAuthStore();

  const login = async (username: string, password: string) => {
    try {
      const response = await apiService.login(username, password);
      setAuth(response.user, response.token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  return { login, logout };
};
```

---

## 🎨 COMMON COMPONENTS

### src/components/Common/Layout.tsx
```typescript
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
```

### src/components/Common/Sidebar.tsx
```typescript
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  BookOpen, 
  Zap, 
  BookMarked,
  LogOut 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/booking', label: 'Booking & Return', icon: BookOpen },
    { path: '/calibration', label: 'Calibration', icon: Zap },
    { path: '/learning', label: 'Learning Center', icon: BookMarked },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">InvManager</h1>
        <p className="text-sm text-gray-600 mt-1">Equipment Inventory</p>
      </div>

      <nav className="mt-8">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 transition-all ${
                isActive
                  ? 'bg-blue-50 border-l-4 border-primary text-primary'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className="mr-3" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-6 w-52">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all font-medium"
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
```

### src/components/Common/LoadingSpinner.tsx
```typescript
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
```

---

## 📊 DASHBOARD COMPONENT EXAMPLE

### src/components/Dashboard/Dashboard.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { useEquipmentStore } from '../../store/equipmentStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiService } from '../../services/api';
import OverviewCard from './OverviewCard';
import CalibrationChart from './CalibrationChart';
import IndustryBreakdown from './IndustryBreakdown';
import Layout from '../Common/Layout';

export const Dashboard: React.FC = () => {
  const { equipment, setEquipment } = useEquipmentStore();
  const [stats, setStats] = useState({
    totalEquipment: 0,
    available: 0,
    booked: 0,
    maintenance: 0,
    calibrationDue: 0,
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  useWebSocket('equipment:updated', loadEquipment);

  const loadEquipment = async () => {
    try {
      const data = await apiService.getEquipment();
      setEquipment(data);
      updateStats(data);
    } catch (error) {
      console.error('Failed to load equipment:', error);
    }
  };

  const updateStats = (data: any[]) => {
    const today = new Date();
    const stats = {
      totalEquipment: data.length,
      available: data.filter(e => e.status === 'available').length,
      booked: data.filter(e => e.status === 'booked').length,
      maintenance: data.filter(e => e.status === 'maintenance').length,
      calibrationDue: data.filter(e => 
        new Date(e.next_calibration_due) < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      ).length,
    };
    setStats(stats);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <OverviewCard
            title="Total Equipment"
            value={stats.totalEquipment}
            color="blue"
            icon="📦"
          />
          <OverviewCard
            title="Available"
            value={stats.available}
            color="green"
            icon="✅"
          />
          <OverviewCard
            title="Booked"
            value={stats.booked}
            color="yellow"
            icon="📋"
          />
          <OverviewCard
            title="Maintenance"
            value={stats.maintenance}
            color="red"
            icon="🔧"
          />
          <OverviewCard
            title="Calibration Due"
            value={stats.calibrationDue}
            color="red"
            icon="⚠️"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CalibrationChart equipment={equipment} />
          <IndustryBreakdown equipment={equipment} />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
```

---

## 🔐 LOGIN PAGE EXAMPLE

### src/pages/LoginPage.tsx
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-primary p-3 rounded-full">
            <LogIn size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">InvManager</h1>
        <p className="text-center text-gray-600 mb-8">Equipment Inventory Management</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>👤 Username: operator1</p>
          <p>🔐 Password: demo123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

---

## 📝 PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  }
}
```

---

## .env.local Configuration

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## ✅ FRONTEND CHECKLIST

- [ ] React + Vite project created
- [ ] Tailwind CSS configured
- [ ] Type definitions added
- [ ] API service setup
- [ ] WebSocket service configured
- [ ] State stores (Zustand) created
- [ ] Custom hooks implemented
- [ ] Layout components completed
- [ ] Dashboard component created
- [ ] Login page functional
- [ ] Router configured
- [ ] Real-time sync working
- [ ] Responsive design verified
- [ ] Light theme animations working

---

## 🚀 RUNNING THE APPLICATION

### Terminal 1 (Backend)
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

### Terminal 2 (Frontend)
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:5173
```

---

**Next:** Deploy and test with 4 concurrent users

