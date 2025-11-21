import { create } from "zustand";

const useAppStore = create((set, get) => ({
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
export { useAppStore };
