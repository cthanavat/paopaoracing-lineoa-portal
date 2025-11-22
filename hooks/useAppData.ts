import { useEffect, useState } from "react";
import { useAppStore, HistoryItem } from "@/store/useAppStore";
import { useRouter } from "next/navigation";

export function useAppData() {
  const {
    user,
    config,
    setConfig,
    setMember,
    setMemberAll,
    setHistoryList,
    setLoadMember,
    setLoadHistory,
    firstLoad,
    setFirstLoad,
  } = useAppStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Fetch Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/gSheet/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: {
              sheetId: process.env.NEXT_PUBLIC_CONFIG_SHEET_ID,
              range: process.env.NEXT_PUBLIC_CONFIG_RANGE,
            },
          }),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error: Get config:", err);
        setError("Failed to load configuration");
      }
    };

    fetchConfig();
  }, [setConfig]);

  // Fetch Members
  useEffect(() => {
    async function fetchMembers() {
      if (!config?.userLine) return;

      try {
        const res = await fetch("/api/gSheet/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: {
              sheetId: `${config.userLine.sheetId}`,
              range: `${config.userLine.range}`,
            },
          }),
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
              if (user.userRole === "admin" && firstLoad) {
                setFirstLoad(false);
                router.push("/attendance");
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
        const res = await fetch("/api/gSheet/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: {
              sheetId: `${config.history.sheetId}`,
              range: `${config.history.range}`,
            },
          }),
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
  }, [user, config, setHistoryList, setLoadHistory]);

  return { error };
}
