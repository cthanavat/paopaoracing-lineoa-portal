"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/utils/apiClient";
import { useLiff } from "@/hooks/useLiff";
import { useAppStore } from "@/store/useAppStore";

type Report = {
  employeeId: string;
  name: string;
  average: number;
  evaluatorCount: number;
  responseCount: number;
  topics: { topicId: string; title: string; average: number }[];
  notes: { topicId: string; note: string }[];
};
export default function EvaluationReport() {
  const { error: liffError } = useLiff();
  const { isLiffReady, isLiffLoading, user } = useAppStore();
  const [month, setMonth] = useState(
    new Date()
      .toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
      })
      .slice(0, 7),
  );
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (liffError) {
      setError(liffError);
      setLoading(false);
      return;
    }
    if (isLiffLoading || !isLiffReady || !user) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const r = await authenticatedFetch(
          `/api/evaluation/report?month=${month}`,
        );
        const b = await r.json();
        if (!r.ok) throw new Error(b.error || "โหลดรายงานไม่สำเร็จ");
        setReports(b.reports);
      } catch (e) {
        setError(e instanceof Error ? e.message : "โหลดรายงานไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLiffLoading, isLiffReady, liffError, month, user]);
  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">รายงานผู้มีสิทธิ์เท่านั้น</p>
            <h1 className="text-2xl font-semibold">สรุปผลรายเดือน</h1>
          </div>
          <Link
            href="/evaluation"
            className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-[#1972BC]"
          >
            แบบประเมิน
          </Link>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-4 h-11 rounded-xl border border-gray-200 bg-white px-3"
        />
        {loading ? (
          <p className="mt-8 text-center text-gray-500">กำลังโหลด…</p>
        ) : error ? (
          <p className="mt-6 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
        ) : reports.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-white p-8 text-center text-gray-500">
            เดือนนี้ยังไม่มีข้อมูล
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {reports.map((report) => (
              <section
                key={report.employeeId}
                className="rounded-[22px] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{report.name}</h2>
                    <p className="text-xs text-gray-500">
                      ผู้ประเมิน {report.evaluatorCount} คน ·{" "}
                      {report.responseCount} คะแนน
                    </p>
                  </div>
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#172033] text-xl font-bold text-white">
                    {report.average.toFixed(1)}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {report.topics
                    .sort((a, b) => b.average - a.average)
                    .map((topic) => (
                      <div
                        key={topic.topicId}
                        className="grid grid-cols-[1fr_auto] items-center gap-3"
                      >
                        <div>
                          <div className="text-xs text-gray-700">
                            {topic.title}
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-[#1972BC]"
                              style={{ width: `${(topic.average / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                        <b className="text-sm text-[#1972BC]">
                          {topic.average.toFixed(1)}
                        </b>
                      </div>
                    ))}
                </div>
                {report.notes.length ? (
                  <details className="mt-4 rounded-xl bg-gray-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      หมายเหตุ ({report.notes.length})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {report.notes.map((item, index) => (
                        <li key={index} className="text-xs text-gray-600">
                          • {item.note}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
