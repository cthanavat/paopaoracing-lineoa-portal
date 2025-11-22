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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employee: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  employees: any[];
  loadUser: boolean;
  loadMember: boolean;
  loadHistory: boolean;
  isLiffReady: boolean;
  isLiffLoading: boolean;
  hasHydrated: boolean;
  loadingEmployees: boolean;
  firstLoad: boolean;

  setFirstLoad: (firstLoad: boolean) => void;
  setUser: (user: User | null) => void;
  setConfig: (config: Config) => void;
  setMember: (member: Member | null) => void;
  setMemberAll: (memberAll: Member[]) => void;
  setHistoryList: (historyList: HistoryItem[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEmployee: (employee: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEmployees: (employees: any[]) => void;
  setLoadUser: (loadUser: boolean) => void;
  setLoadMember: (loadMember: boolean) => void;
  setLoadHistory: (loadHistory: boolean) => void;
  setLoadingEmployees: (loadingEmployees: boolean) => void;
  setIsLiffReady: (isLiffReady: boolean) => void;
  setIsLiffLoading: (isLiffLoading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  config: {},
  member: null,
  memberAll: [],
  historyList: [],
  employee: [],
  employees: [],
  loadUser: true,
  loadMember: true,
  loadHistory: true,
  isLiffReady: false,
  isLiffLoading: true,
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
}));
