# Arogya Dental Care & Implant Centre - Clinic Management System

A clinic management, reception desk, and financial accounting application designed for dental practices.

## 🌟 Key Features

- **Patient Management & OPD Queue**:
  - Full patient registry with medical history, allergy alerts, and demographics.
  - One-time registration fee tracking (₹500 / configurable).
  - Walk-in queue and appointment scheduler with doctor assignments.

- **Cash Collection & Accounts Desk**:
  - **Live Terminal**: Daily inflow register tracking Cash, UPI, Cards, and Net Banking.
  - **Official Money Receipts**: Clean, printable 80mm/A4 thermal or paper money receipts with amount-in-words converter, clinic branding, and tax identifiers.
  - **Digital Receipt Dispatch**: Instant SMS and WhatsApp receipt delivery with automated audit logging.
  - **Doctor Settlements & Commissions**: Calculation of consultant fees, clinic splits, and payouts.
  - **Petty Cash & Clinic Expenses**: Categorized operational expense tracking with real-time net cash-in-drawer calculation.

- **Supabase Cloud Persistence & Offline Resilience**:
  - Local-first architecture: Works smoothly even during network drops with local state persistence.
  - Real-time cloud sync with Supabase PostgreSQL.
  - Non-destructive schema migration tools and PostgREST schema cache management.

- **Audit & Compliance**:
  - Complete payment transaction ledger.
  - SMS & notification audit logs.
  - Daily collection summaries with print-ready cash sheets.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Database & Sync**: Supabase (`@supabase/supabase-js`), PostgreSQL
- **PDF Generation**: jsPDF
- **Animations**: Motion

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (optional, or configure directly in the UI):
```env
# Optional Supabase credentials
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

### 5. Build for Production
```bash
npm run build
```

---

## 📄 License
Private clinic practice software. All rights reserved.
