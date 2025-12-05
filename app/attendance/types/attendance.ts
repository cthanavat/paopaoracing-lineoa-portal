export interface AttendanceRecord {
  attendance_id: string;
  created_at: string;
  employee_id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: string;
  type: string;
  leaveType?: string;
  leaveReason?: string;
  leaveDays?: string;
  leaveStatus?: string;
  leaveStatusText?: string;
}

export interface RawSheetRecord {
  [key: string]: string;
  employee_id: string;
}

export interface Employee {
  employee_id: string;
  [key: string]: string;
}

export interface LeaveRecord {
  leave_id: string;
  created_at: string;
  employee_id: string;
  date: string;
  leave_option: string;
  reason: string;
  days: string;
  status: string;
}

export interface AllEmployeeLeave {
  employeeName: string;
  leaveType: string;
  leaveReason: string;
  leaveDays: string;
  date: string;
  status: string;
}
