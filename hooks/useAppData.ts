import { useEffect, useState } from "react";
import { useAppStore, HistoryItem } from "@/store/useAppStore";
import { usePathname, useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/utils/apiClient";

export function useAppData() {
  const {
    user,
    config,
    setConfig,
    memberAll,
    setMember,
    setMemberAll,
    historyList,
    setHistoryList,
    setLoadMember,
    setLoadHistory,
    firstLoad,
    setFirstLoad,
    employees,
    setEmployee,
    setEmployees,
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
      } catch (err: any) {
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
        const existingMembers = memberAll;
        if (existingMembers.length > 0) {
          if (user?.userId) {
            const existingMember = existingMembers.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (m: any) => m.userId === user.userId,
            );
            if (existingMember) {
              setMember(existingMember);
            }
          }
          return;
        }

        const res = await authenticatedFetch("/api/gSheet/get", {
          method: "POST",
          body: JSON.stringify({ resource: "userLine" }),
        });

        const result = await res.json();
        if (result.data) {
          setMemberAll(result.data);

          if (user?.userId) {
            const userMember = result.data.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (m: any) => m.userId === user.userId,
            );
            if (userMember) {
              setMember(userMember);
              if (user.userRole === "admin" && firstLoad && pathname === "/") {
                setFirstLoad(false);
                router.push("/dashboard");
              }
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Failed to load members:", err);
        setError("Failed to load members");
      } finally {
        setLoadMember(false);
      }
    }

    if (user && config?.userLine) {
      fetchMembers();
    }
  }, [
    memberAll,
    user,
    config,
    setMemberAll,
    setMember,
    setLoadMember,
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
                new Date(b.bill_date).getTime() -
                new Date(a.bill_date).getTime(),
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

      try {
        if (employees.length > 0) {
          const foundEmployee = employees.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => e.userId === user?.userId,
          );

          if (foundEmployee) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setEmployee(foundEmployee as any);

            if (firstLoad && pathname === "/") {
              setFirstLoad(false);
              router.push("/dashboard");
            }
          }
          return;
        }

        const res = await authenticatedFetch("/api/gSheet/get", {
          method: "POST",
          body: JSON.stringify({ resource: "employees" }),
        });

        const result = await res.json();
        if (result.data) {
          setEmployees(result.data);
          const foundEmployee = result.data.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => e.userId === user?.userId,
          );

          if (foundEmployee) {
            // It's an employee!
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setEmployee(foundEmployee as any);

            if (firstLoad && pathname === "/") {
              setFirstLoad(false);
              router.push("/dashboard");
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    }

    if (user && config?.employees) {
      fetchEmployees();
    }
  }, [
    user,
    config,
    employees,
    setEmployees,
    setFirstLoad,
    firstLoad,
    router,
    setEmployee,
    pathname,
  ]);

  return { error };
}
