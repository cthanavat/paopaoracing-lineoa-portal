import { useEffect, useState } from "react";
import { useAppStore, HistoryItem } from "@/store/useAppStore";
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/utils/apiClient";
import { getHistoryTimestamp } from "@/lib/historyDate.mjs";

const normalizeValue = (value?: string) => (value || "").trim().toLowerCase();

const isEmployeeActive = (active?: string) =>
  ["true", "1", "yes", "active"].includes(normalizeValue(active));

export function useAppData() {
  const {
    user,
    config,
    setConfig,
    setMember,
    setMemberAll,
    historyList,
    setHistoryList,
    setLoadMember,
    setLoadHistory,
    firstLoad,
    setFirstLoad,
    employee,
    setEmployee,
    setEmployees,
    setLoadingEmployees,
    isLiffReady,
  } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  // Fetch Config
  useEffect(() => {
    const fetchConfig = async () => {
      if (Object.keys(config || {}).length > 0) {
        return;
      }

      try {
        const res = await authenticatedFetch("/api/gSheet/get", {
          method: "POST",
          body: JSON.stringify({ resource: "config" }),
        });
        const result = await res.json();
        if (result.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dataJson = result.data.reduce((acc: any, cur: any) => {
            if (cur.tableName) acc[cur.tableName] = cur;
            return acc;
          }, {});
          setConfig(dataJson);
        }
      } catch (err: unknown) {
        console.error("Error: Get config:", err);
        setError("Failed to load configuration");
      }
    };

    if (isLiffReady && user) {
      fetchConfig();
    }
  }, [config, isLiffReady, setConfig, user]);

  // Fetch Members
  useEffect(() => {
    async function fetchMembers() {
      if (!config?.userLine) return;

      try {
        // Membership can be revoked in the Sheet. Always revalidate and clear
        // stale state instead of trusting the in-memory member list.
        const res = await authenticatedFetch(
          "/api/gSheet/get",
          {
            method: "POST",
            body: JSON.stringify({ resource: "userLine" }),
          },
          { requireVerifiedToken: true },
        );

        const result = await res.json();
        if (!res.ok || !Array.isArray(result.data)) {
          setMemberAll([]);
          setMember(null);
          return;
        }

        setMemberAll(result.data);
        const userMember = result.data.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (record: any) => record.userId === user?.userId,
        );
        setMember(userMember || null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setMemberAll([]);
        setMember(null);
        console.error("Failed to load members:", err);
        setError("Failed to load members");
      } finally {
        setLoadMember(false);
      }
    }

    if (user && config?.userLine) {
      fetchMembers();
    } else if (isLiffReady) {
      setMemberAll([]);
      setMember(null);
    }
  }, [
    user,
    config,
    setMemberAll,
    setMember,
    setLoadMember,
    isLiffReady,
    firstLoad,
    setFirstLoad,
    router,
  ]);

  // Fetch History
  useEffect(() => {
    async function fetchHistory() {
      if (!config?.history) return;

      try {
        if (historyList.length > 0) {
          return;
        }

        const res = await authenticatedFetch("/api/gSheet/get", {
          method: "POST",
          body: JSON.stringify({ resource: "history" }),
        });

        const result = await res.json();
        if (result.data && user?.userId) {
          const userHistory = (result.data as HistoryItem[])
            .filter((bill: HistoryItem) => bill.userId === user.userId)
            .sort(
              (a: HistoryItem, b: HistoryItem) =>
                getHistoryTimestamp(b.bill_date) -
                getHistoryTimestamp(a.bill_date),
            );
          setHistoryList(userHistory);
        }
      } catch (err: unknown) {
        // Use unknown for caught errors
        console.error("Failed to load history:", err);
        setError("Failed to load history");
      } finally {
        setLoadHistory(false);
      }
    }

    if (user && config?.history) {
      fetchHistory();
    }
  }, [user, config, historyList.length, setHistoryList, setLoadHistory]);

  // Fetch Employees (for auto-redirect)
  useEffect(() => {
    async function fetchEmployees() {
      if (!config?.employees) return;

      setLoadingEmployees(true);
      try {
        // Employee access is security-sensitive: always revalidate against the
        // server instead of trusting the in-memory employee list.
        const res = await authenticatedFetch(
          "/api/gSheet/get",
          {
            method: "POST",
            body: JSON.stringify({ resource: "employees" }),
          },
          { requireVerifiedToken: true },
        );

        const result = await res.json();
        if (!res.ok || !Array.isArray(result.data)) {
          setEmployees([]);
          setEmployee(null);
          return;
        }

        setEmployees(result.data);
        const foundEmployee = result.data.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any) => e.userId === user?.userId && isEmployeeActive(e.active),
        );

        // Clearing stale authorization is as important as setting it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setEmployee((foundEmployee as any) || null);
      } catch (err) {
        setEmployees([]);
        setEmployee(null);
        console.error("Failed to fetch employees:", err);
      } finally {
        setLoadingEmployees(false);
      }
    }

    if (user && config?.employees) {
      fetchEmployees();
    } else if (isLiffReady) {
      setEmployees([]);
      setEmployee(null);
      setLoadingEmployees(false);
    }
  }, [
    user,
    config,
    setEmployees,
    setFirstLoad,
    firstLoad,
    router,
    setEmployee,
    setLoadingEmployees,
    pathname,
    isLiffReady,
  ]);

  useEffect(() => {
    if (
      !firstLoad ||
      pathname !== "/" ||
      !employee ||
      !isEmployeeActive(employee.active)
    ) {
      return;
    }

    setFirstLoad(false);
    router.push("/attendance");
  }, [employee, firstLoad, pathname, router, setFirstLoad]);

  return { error };
}
