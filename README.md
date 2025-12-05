# Paopao Racing LINE OA Portal

> Employee attendance and leave management system integrated with LINE Official Account

## 🚀 Features

### 👤 Authentication & Profile

- LINE Login integration via LIFF
- User profile with employee information
- Role-based access (Admin/Employee)

### ⏰ Attendance Management

- **Check-in/Check-out** system with timestamp
- Real-time attendance tracking
- Attendance history with date filtering
- Merged view for attendance + leave records

### 🏖️ Leave Management

- Submit leave requests with details
- Leave approval workflow
- Leave history tracking (current month onwards)
- Leave type categorization (sick leave, personal leave, etc.)

### 📊 Dashboard & Reports

- **Leave Schedule**: View all employees' approved upcoming leaves
- **Attendance Timeline**: Visual timeline of check-in/out records
- **Leave Status Indicators**: Color-coded status (pending/approved/rejected)

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: Flowbite React + Tailwind CSS
- **State Management**: Zustand
- **Authentication**: LINE LIFF SDK
- **Data Storage**: Google Sheets API
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+
- LINE Developers Account
- Google Cloud Project (for Sheets API)
- Google Service Account credentials

## ⚙️ Environment Variables

```env
GOOGLE_CREDENTIALS_B64=<base64-encoded-service-account-json>
NEXT_PUBLIC_LIFF_ID=<your-liff-id>
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
app/
├── attendance/          # Main attendance page
├── api/
│   ├── gSheet/         # Google Sheets API routes
│   └── attendance/     # Attendance API routes
├── components/         # Reusable components
└── page.tsx           # Home page

hooks/
├── useLiff.ts         # LINE LIFF hook
└── useAppData.ts      # App data hook

store/
└── useAppStore.ts     # Zustand store
```

## 📊 Google Sheets Structure

### Employees Sheet

- `employee_id`, `userId`, `name`, `nickname`, `firstname`, `lastname`, `role`

### Attendance Sheet

- `attendance_id`, `employee_id`, `date`, `checkIn`, `checkOut`, `status`, `workHours`

### Employee Leaves Sheet

- `leave_id`, `employee_id`, `date`, `leave_option`, `reason`, `days`, `status` (Pending, Approved, Rejected, Cancelled)

## 🔐 Security

- Server-side API routes for sensitive operations
- Google Service Account for secure Sheets access
- LINE LIFF for authenticated user sessions

## 📝 Version History

- **V2505.5** - Attendance & Leave Management System (Current)
  - Merged attendance and leave records
  - Leave schedule for all employees
  - Enhanced UI with color-coded statuses
- **V2505.2** - Initial Next.js migration
  - Replaced Nuxt.js version
  - LINE Login integration

## 📄 License

Private - Paopao Racing Internal Use Only

---

**Developed for Paopao Racing Shop** 🏍️
