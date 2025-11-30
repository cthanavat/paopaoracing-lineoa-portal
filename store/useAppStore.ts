import { create } from "zustand";

export interface User {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  userRole?: string;
}

export interface Config {
  userLine?: { sheetId: string; range: string };
  history?: { sheetId: string; range: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Member {
  name: string;
  phone: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Employee {
  employee_id: string;
  nickname?: string;
  firstname?: string;
  lastname?: string;
  role?: string;
  userRole?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface HistoryItem {
  bill_date: string;
  car_plate_number: string;
  bill_total_amount: string;
  bill_detail: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface AppState {
  user: User | null;
  config: Config;
  member: Member | null;
  memberAll: Member[];
  historyList: HistoryItem[];
  employee: Employee | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employees: any[];
  loadUser: boolean;
  loadMember: boolean;
  loadHistory: boolean;
  isLiffReady: boolean;
  isLiffLoading: boolean;
  isInClient: boolean; // New state to track if running in LIFF browser
  hasHydrated: boolean;
  loadingEmployees: boolean;
  firstLoad: boolean;

  setFirstLoad: (firstLoad: boolean) => void;
  setUser: (user: User | null) => void;
  setConfig: (config: Config) => void;
  setMember: (member: Member | null) => void;
  setMemberAll: (memberAll: Member[]) => void;
  setHistoryList: (historyList: HistoryItem[]) => void;
  setEmployee: (employee: Employee | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEmployees: (employees: any[]) => void;
  setLoadUser: (loadUser: boolean) => void;
  setLoadMember: (loadMember: boolean) => void;
  setLoadHistory: (loadHistory: boolean) => void;
  setLoadingEmployees: (loadingEmployees: boolean) => void;
  setIsLiffReady: (isLiffReady: boolean) => void;
  setIsLiffLoading: (isLiffLoading: boolean) => void;
  setIsInClient: (isInClient: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  config: {},
  member: null,
  memberAll: [],
  historyList: [],
  employee: null,
  employees: [],
  loadUser: true,
  loadMember: true,
  loadHistory: true,
  isLiffReady: false,
  isLiffLoading: true,
  isInClient: false, // Default to false
  hasHydrated: false,
  loadingEmployees: false,
  firstLoad: true,

  setFirstLoad: (firstLoad) => set({ firstLoad }),
  setUser: (user) => set({ user }),
  setConfig: (config) => set({ config }),
  setMember: (member) => set({ member }),
  setMemberAll: (memberAll) => set({ memberAll }),
  setHistoryList: (historyList) => set({ historyList }),
  setEmployee: (employee) => set({ employee }),
  setEmployees: (employees) => set({ employees }),
  setLoadUser: (loadUser) => set({ loadUser }),
  setLoadMember: (loadMember) => set({ loadMember }),
  setLoadHistory: (loadHistory) => set({ loadHistory }),
  setLoadingEmployees: (loadingEmployees) => set({ loadingEmployees }),
  setIsLiffReady: (isLiffReady) => set({ isLiffReady }),
  setIsLiffLoading: (isLiffLoading) => set({ isLiffLoading }),
  setIsInClient: (isInClient) => set({ isInClient }),
}));
