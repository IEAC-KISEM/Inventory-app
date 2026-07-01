# FILE STRUCTURE & MANUAL STORAGE GUIDE
## Where to Store Your User Manuals

---

## 📁 COMPLETE FILE STRUCTURE

### Project Root
```
inventory-management-system/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── database/
│   │   │   ├── init.ts
│   │   │   └── seeds/
│   │   │       └── seedInventory.ts
│   │   └── server.ts
│   │
│   ├── uploads/  ⭐ USER MANUALS GO HERE
│   │   ├── manuals/
│   │   │   ├── PQF01/
│   │   │   │   └── manual.pdf
│   │   │   ├── PQF02/
│   │   │   │   └── manual.pdf
│   │   │   ├── PQH03/
│   │   │   │   └── manual.pdf
│   │   │   ├── PQK04/
│   │   │   │   └── manual.pdf
│   │   │   ├── PWH05/
│   │   │   │   └── manual.pdf
│   │   │   ├── PCH06/
│   │   │   │   └── manual.pdf
│   │   │   ├── PCK07/
│   │   │   │   └── manual.pdf
│   │   │   ├── PCH08/
│   │   │   │   └── manual.pdf
│   │   │   ├── PCK09/
│   │   │   │   └── manual.pdf
│   │   │   ├── UWA10/
│   │   │   │   └── manual.pdf
│   │   │   ├── UWF11/
│   │   │   │   └── manual.pdf
│   │   │   ├── AFV12/
│   │   │   │   └── manual.pdf
│   │   │   ├── ACF13/
│   │   │   │   └── manual.pdf
│   │   │   ├── ACF14/
│   │   │   │   └── manual.pdf
│   │   │   ├── FGK15/
│   │   │   │   └── manual.pdf
│   │   │   ├── FGT16/
│   │   │   │   └── manual.pdf
│   │   │   ├── VAF17/
│   │   │   │   └── manual.pdf
│   │   │   ├── VAF18/
│   │   │   │   └── manual.pdf
│   │   │   ├── TLT19/
│   │   │   │   └── manual.pdf
│   │   │   ├── LXF20/
│   │   │   │   └── manual.pdf
│   │   │   ├── LXF21/
│   │   │   │   └── manual.pdf
│   │   │   ├── STU22/
│   │   │   │   └── manual.pdf
│   │   │   ├── DTF23/
│   │   │   │   └── manual.pdf
│   │   │   ├── DTF24/
│   │   │   │   └── manual.pdf
│   │   │   ├── THT25/
│   │   │   │   └── manual.pdf
│   │   │   ├── THT26/
│   │   │   │   └── manual.pdf
│   │   │   ├── IAT27/
│   │   │   │   └── manual.pdf
│   │   │   └── DPT28/
│   │   │       └── manual.pdf
│   │   │
│   │   └── product-images/
│   │       ├── PQF01.jpg
│   │       ├── PQF02.jpg
│   │       ├── PQH03.jpg
│   │       ├── ... (28 images)
│   │
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── MASTER_PROMPT.md
├── BACKEND_SETUP.md
├── FRONTEND_SETUP.md
├── FILE_STRUCTURE.md (this file)
├── docker-compose.yml
└── README.md
```

---

## 🗂️ USER MANUAL STORAGE - DETAILED INSTRUCTIONS

### ✅ STORAGE LOCATION (Serial Number Based)

Each equipment's manual should be stored in its own folder named by **Serial Number**.

**Path Format:** `backend/uploads/manuals/{SERIAL_NUMBER}/manual.pdf`

### 📋 28 EQUIPMENT - COMPLETE STORAGE PATHS

| # | Equipment | Serial | Storage Path |
|---|-----------|--------|--------------|
| 1 | Fluke 1775 | PQF01 | `backend/uploads/manuals/PQF01/manual.pdf` |
| 2 | Fluke 1775 | PQF02 | `backend/uploads/manuals/PQF02/manual.pdf` |
| 3 | Hioki PQ3100 | PQH03 | `backend/uploads/manuals/PQH03/manual.pdf` |
| 4 | Krykard ALM36 | PQK04 | `backend/uploads/manuals/PQK04/manual.pdf` |
| 5 | Hioki PW3360-20 | PWH05 | `backend/uploads/manuals/PWH05/manual.pdf` |
| 6 | Hioki CM3286-50 | PCH06 | `backend/uploads/manuals/PCH06/manual.pdf` |
| 7 | Krykard F409 | PCK07 | `backend/uploads/manuals/PCK07/manual.pdf` |
| 8 | Hioki CM3286-50 | PCH08 | `backend/uploads/manuals/PCH08/manual.pdf` |
| 9 | Krykard F409 | PCK09 | `backend/uploads/manuals/PCK09/manual.pdf` |
| 10 | Acron TR600H | UWA10 | `backend/uploads/manuals/UWA10/manual.pdf` |
| 11 | Flexim F601 | UWF11 | `backend/uploads/manuals/UWF11/manual.pdf` |
| 12 | VPS VPS-R250-M100-D11-PN16 | AFV12 | `backend/uploads/manuals/AFV12/manual.pdf` |
| 13 | Fluke ii910 | ACF13 | `backend/uploads/manuals/ACF13/manual.pdf` |
| 14 | Fluke ii500 | ACF14 | `backend/uploads/manuals/ACF14/manual.pdf` |
| 15 | Kane 958 | FGK15 | `backend/uploads/manuals/FGK15/manual.pdf` |
| 16 | Testo 340 | FGT16 | `backend/uploads/manuals/FGT16/manual.pdf` |
| 17 | Fluke 925 | VAF17 | `backend/uploads/manuals/VAF17/manual.pdf` |
| 18 | Fluke 925 | VAF18 | `backend/uploads/manuals/VAF18/manual.pdf` |
| 19 | Testo 176T4 | TLT19 | `backend/uploads/manuals/TLT19/manual.pdf` |
| 20 | Fluke 941 | LXF20 | `backend/uploads/manuals/LXF20/manual.pdf` |
| 21 | Fluke 941 | LXF21 | `backend/uploads/manuals/LXF21/manual.pdf` |
| 22 | UE Systems 100-UP | STU22 | `backend/uploads/manuals/STU22/manual.pdf` |
| 23 | Fluke 931 | DTF23 | `backend/uploads/manuals/DTF23/manual.pdf` |
| 24 | Fluke 931 | DTF24 | `backend/uploads/manuals/DTF24/manual.pdf` |
| 25 | Testo 872 | THT25 | `backend/uploads/manuals/THT25/manual.pdf` |
| 26 | Testo 883 | THT26 | `backend/uploads/manuals/THT26/manual.pdf` |
| 27 | Testo IAQ Meter | IAT27 | `backend/uploads/manuals/IAT27/manual.pdf` |
| 28 | Testo 510 | DPT28 | `backend/uploads/manuals/DPT28/manual.pdf` |

---

## 🛠️ HOW TO CREATE THE FOLDER STRUCTURE

### Option 1: Windows Command Prompt
```batch
cd backend\uploads\manuals

mkdir PQF01 && mkdir PQF02 && mkdir PQH03 && mkdir PQK04
mkdir PWH05 && mkdir PCH06 && mkdir PCK07 && mkdir PCH08
mkdir PCK09 && mkdir UWA10 && mkdir UWF11 && mkdir AFV12
mkdir ACF13 && mkdir ACF14 && mkdir FGK15 && mkdir FGT16
mkdir VAF17 && mkdir VAF18 && mkdir TLT19 && mkdir LXF20
mkdir LXF21 && mkdir STU22 && mkdir DTF23 && mkdir DTF24
mkdir THT25 && mkdir THT26 && mkdir IAT27 && mkdir DPT28
```

### Option 2: PowerShell
```powershell
$serials = @("PQF01", "PQF02", "PQH03", "PQK04", "PWH05", "PCH06", 
             "PCK07", "PCH08", "PCK09", "UWA10", "UWF11", "AFV12", 
             "ACF13", "ACF14", "FGK15", "FGT16", "VAF17", "VAF18", 
             "TLT19", "LXF20", "LXF21", "STU22", "DTF23", "DTF24", 
             "THT25", "THT26", "IAT27", "DPT28")

foreach ($serial in $serials) {
    New-Item -ItemType Directory -Path "backend\uploads\manuals\$serial" -Force
}
```

### Option 3: Bash (Linux/Mac)
```bash
cd backend/uploads/manuals

for serial in PQF01 PQF02 PQH03 PQK04 PWH05 PCH06 PCK07 PCH08 PCK09 UWA10 UWF11 AFV12 ACF13 ACF14 FGK15 FGT16 VAF17 VAF18 TLT19 LXF20 LXF21 STU22 DTF23 DTF24 THT25 THT26 IAT27 DPT28; do
    mkdir -p "$serial"
done
```

---

## 📚 HOW TO ADD MANUALS

### Step 1: Locate Your Manual PDF
- Obtain the user manual PDF file for each equipment
- Name it as `manual.pdf`

### Step 2: Place in Correct Folder
For example, if you have Fluke 1775 manual:
1. Place it at: `backend/uploads/manuals/PQF01/manual.pdf`
2. OR at: `backend/uploads/manuals/PQF02/manual.pdf` (for the second Fluke 1775)

### Step 3: Update Database Path (Optional)
The system can auto-detect manuals, but you can also manually update the database:

```sql
UPDATE equipment 
SET manual_path = '/uploads/manuals/PQF01/manual.pdf'
WHERE serial_number = 'PQF01';
```

---

## 🖼️ PRODUCT IMAGES STORAGE

**Path Format:** `backend/uploads/product-images/{SERIAL_NUMBER}.jpg`

### Examples:
```
backend/uploads/product-images/PQF01.jpg
backend/uploads/product-images/PQF02.jpg
backend/uploads/product-images/PQH03.jpg
... (28 images total)
```

---

## 🔧 AUTOMATIC FOLDER CREATION (Code)

### When Adding Equipment via API

The backend automatically creates folders when equipment is added:

```typescript
// In addEquipment controller
export const addEquipment = async (req, res) => {
  const { serial_number } = req.body;
  
  // Auto-create folder
  const dir = FileManager.createSerialNumberDirectory(serial_number);
  
  // Save equipment to database
  const equipment = await Equipment.create({
    ...req.body,
    manual_path: FileManager.getManualPath(serial_number),
    image_path: FileManager.getImagePath(serial_number)
  });
  
  res.json(equipment);
};
```

---

## 📖 ACCESSING MANUALS IN LEARNING CENTER

### Frontend Code Example

```typescript
// src/components/Learning/ManualViewer.tsx
import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ManualViewerProps {
  equipment: Equipment;
}

export const ManualViewer: React.FC<ManualViewerProps> = ({ equipment }) => {
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [pageNumber, setPageNumber] = React.useState(1);

  const manualUrl = equipment.manual_path 
    ? `/uploads/manuals/${equipment.serial_number}/manual.pdf`
    : null;

  if (!manualUrl) {
    return <div className="text-gray-500">No manual available</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">User Manual</h3>
      
      <Document file={manualUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={pageNumber} />
      </Document>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
          disabled={pageNumber === 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {pageNumber} of {numPages}
        </span>

        <button
          onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
          disabled={pageNumber === numPages}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ManualViewer;
```

---

## 🚀 BATCH FILE MANAGEMENT SCRIPT

### PowerShell Script to Manage All Manuals

```powershell
# scripts/setup-manuals.ps1

param(
    [string]$SourceDir = "C:\Manuals",  # Path where your PDFs are stored
    [string]$TargetDir = "backend\uploads\manuals"
)

$serials = @(
    "PQF01", "PQF02", "PQH03", "PQK04", "PWH05", "PCH06", 
    "PCK07", "PCH08", "PCK09", "UWA10", "UWF11", "AFV12", 
    "ACF13", "ACF14", "FGK15", "FGT16", "VAF17", "VAF18", 
    "TLT19", "LXF20", "LXF21", "STU22", "DTF23", "DTF24", 
    "THT25", "THT26", "IAT27", "DPT28"
)

foreach ($serial in $serials) {
    $dir = "$TargetDir\$serial"
    
    # Create directory if it doesn't exist
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created: $dir"
    }
    
    # Copy manual if source exists
    $source = "$SourceDir\$serial.pdf"
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination "$dir\manual.pdf" -Force
        Write-Host "📄 Copied: $serial.pdf"
    } else {
        Write-Host "⚠️  Missing: $source"
    }
}

Write-Host "`n✅ Manual setup complete!"
```

**Usage:**
```powershell
.\setup-manuals.ps1 -SourceDir "C:\Path\To\Your\Manuals"
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] `backend/uploads/manuals/` folder exists
- [ ] All 28 serial number folders created
- [ ] Each folder contains `manual.pdf`
- [ ] `backend/uploads/product-images/` folder exists
- [ ] Product images named correctly (e.g., `PQF01.jpg`)
- [ ] Backend can access files via `/uploads/` route
- [ ] Frontend displays manuals in Learning Center
- [ ] Manual viewer works with PDF pagination

---

## 🔗 SERVING FILES

### Backend - Express Configuration

```typescript
// src/server.ts
import express from 'express';

const app = express();

// Serve uploads folder
app.use('/uploads', express.static('uploads'));

// Serve manual by serial number
app.get('/api/manuals/:serialNumber', (req, res) => {
  const filePath = path.join(__dirname, '../uploads/manuals', req.params.serialNumber, 'manual.pdf');
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Manual not found' });
  }
});
```

---

## 💾 COMPLETE DIRECTORY TREE

After setup, your structure should look like:

```
backend/
├── uploads/
│   ├── manuals/
│   │   ├── PQF01/
│   │   │   ├── manual.pdf ✅
│   │   ├── PQF02/
│   │   │   ├── manual.pdf ✅
│   │   ├── PQH03/
│   │   │   ├── manual.pdf ✅
│   │   ├── PQK04/
│   │   │   ├── manual.pdf ✅
│   │   ├── PWH05/
│   │   │   ├── manual.pdf ✅
│   │   ├── PCH06/
│   │   │   ├── manual.pdf ✅
│   │   ├── PCK07/
│   │   │   ├── manual.pdf ✅
│   │   ├── PCH08/
│   │   │   ├── manual.pdf ✅
│   │   ├── PCK09/
│   │   │   ├── manual.pdf ✅
│   │   ├── UWA10/
│   │   │   ├── manual.pdf ✅
│   │   ├── UWF11/
│   │   │   ├── manual.pdf ✅
│   │   ├── AFV12/
│   │   │   ├── manual.pdf ✅
│   │   ├── ACF13/
│   │   │   ├── manual.pdf ✅
│   │   ├── ACF14/
│   │   │   ├── manual.pdf ✅
│   │   ├── FGK15/
│   │   │   ├── manual.pdf ✅
│   │   ├── FGT16/
│   │   │   ├── manual.pdf ✅
│   │   ├── VAF17/
│   │   │   ├── manual.pdf ✅
│   │   ├── VAF18/
│   │   │   ├── manual.pdf ✅
│   │   ├── TLT19/
│   │   │   ├── manual.pdf ✅
│   │   ├── LXF20/
│   │   │   ├── manual.pdf ✅
│   │   ├── LXF21/
│   │   │   ├── manual.pdf ✅
│   │   ├── STU22/
│   │   │   ├── manual.pdf ✅
│   │   ├── DTF23/
│   │   │   ├── manual.pdf ✅
│   │   ├── DTF24/
│   │   │   ├── manual.pdf ✅
│   │   ├── THT25/
│   │   │   ├── manual.pdf ✅
│   │   ├── THT26/
│   │   │   ├── manual.pdf ✅
│   │   ├── IAT27/
│   │   │   ├── manual.pdf ✅
│   │   └── DPT28/
│   │       ├── manual.pdf ✅
│   │
│   └── product-images/
│       ├── PQF01.jpg ✅
│       ├── PQF02.jpg ✅
│       ├── PQH03.jpg ✅
│       ├── ... (26 more images)
```

---

## 🎯 QUICK REFERENCE

| Action | Location | Format |
|--------|----------|--------|
| **Store Manual** | `backend/uploads/manuals/{SERIAL}/manual.pdf` | PDF |
| **Store Image** | `backend/uploads/product-images/{SERIAL}.jpg` | JPG |
| **Access Manual** | `GET /uploads/manuals/{SERIAL}/manual.pdf` | HTTP |
| **Database Reference** | `equipment.manual_path` | String |
| **Create Folder** | Auto-created on equipment add OR manual creation | Directory |

---

**Ready to use! Place your manuals in the directories and the system will handle the rest.** ✅

