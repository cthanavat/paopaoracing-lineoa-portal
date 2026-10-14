"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/utils/apiClient";
import { useLiff } from "@/hooks/useLiff";
import { useAppData } from "@/hooks/useAppData";
import { useAppStore } from "@/store/useAppStore";

type Employee = { employeeId: string; name: string; role: string };
type Topic = {
  topicId: string;
  title: string;
  description: string;
  employeeIds: string[];
};
type Score = {
  employeeId: string;
  topicId: string;
  score: number | null;
  note: string;
  answered: boolean;
};
type Data = {
  evaluator: { name: string };
  week: { label: string; isFriday: boolean };
  employees: Employee[];
  topics: Topic[];
  existingScores: Score[];
  status: string;
  locked: boolean;
};

const keyOf = (employeeId: string, topicId: string) =>
  `${employeeId}:${topicId}`;

export default function EvaluationPage() {
  const { error: liffError } = useLiff();
  useAppData();
  const { isLiffReady, isLiffLoading, user } = useAppStore();
  const [data, setData] = useState<Data | null>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [noteKey, setNoteKey] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (liffError) {
      setError(liffError);
      setLoading(false);
      return;
    }

    if (isLiffLoading || !isLiffReady || !user) {
      return;
    }

    (async () => {
      try {
        const response = await authenticatedFetch("/api/evaluation");
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error || "โหลดแบบประเมินไม่สำเร็จ");
        setData(body);
        const next: Record<string, Score> = {};
        for (const topic of body.topics)
          for (const employeeId of topic.employeeIds)
            next[keyOf(employeeId, topic.topicId)] = {
              employeeId,
              topicId: topic.topicId,
              score: null,
              note: "",
              answered: false,
            };
        for (const item of body.existingScores)
          next[keyOf(item.employeeId, item.topicId)] = item;
        setScores(next);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "โหลดแบบประเมินไม่สำเร็จ",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [isLiffLoading, isLiffReady, liffError, user]);

  const scoreList = useMemo(() => Object.values(scores), [scores]);
  const completed = scoreList.filter((item) => item.answered).length;
  const invalid = scoreList.find(
    (item) => item.score !== null && item.score <= 2 && !item.note.trim(),
  );
  const canReview =
    scoreList.length > 0 &&
    completed === scoreList.length &&
    !invalid &&
    data?.week.isFriday &&
    !data?.locked;
  const activeNote = noteKey ? scores[noteKey] : null;
  const activeEmployee = data?.employees.find(
    (item) => item.employeeId === activeNote?.employeeId,
  );
  const activeTopic = data?.topics.find(
    (item) => item.topicId === activeNote?.topicId,
  );

  const setScore = (
    employeeId: string,
    topicId: string,
    score: number | null,
  ) =>
    setScores((previous) => ({
      ...previous,
      [keyOf(employeeId, topicId)]: {
        ...previous[keyOf(employeeId, topicId)],
        score,
        answered: true,
      },
    }));
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/evaluation", {
        method: "POST",
        body: JSON.stringify({ scores: scoreList }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "บันทึกไม่สำเร็จ");
      setSubmitted(true);
      setReviewing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] text-gray-600">
        กำลังโหลดแบบประเมิน…
      </main>
    );
  if (error && !data)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-6">
        <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow">
          <h1 className="text-xl font-semibold">เปิดแบบประเมินไม่ได้</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  if (!data) return null;
  if (submitted)
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-4 py-12">
        <section className="mx-auto max-w-lg rounded-[26px] bg-white p-7 text-center shadow-sm">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-4xl text-emerald-700">
            ✓
          </div>
          <h1 className="mt-5 text-2xl font-semibold">ส่งแบบประเมินแล้ว</h1>
          <p className="mt-2 text-gray-500">สัปดาห์ {data.week.label}</p>
          <Link
            href="/attendance"
            className="mt-7 flex h-12 items-center justify-center rounded-2xl bg-[#1972BC] font-semibold text-white"
          >
            กลับไปเช็กเอาต์ →
          </Link>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-3 h-11 w-full rounded-2xl bg-gray-100 text-sm font-medium text-[#1972BC]"
          >
            แก้ไขแบบประเมิน
          </button>
        </section>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-3 pt-6 pb-[calc(env(safe-area-inset-bottom)+11rem)]">
      <div className="mx-auto max-w-lg">
        <header className="rounded-[22px] bg-[#172033] p-4 text-white shadow-xl">
          <p className="text-xs text-slate-300">ประเมินประจำสัปดาห์</p>
          <div className="mt-1 flex items-center justify-between">
            <h1 className="text-xl font-semibold">{data.week.label}</h1>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px]">
              ก่อนเช็กเอาต์วันศุกร์
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-[#6FB6FF]"
              style={{
                width: `${scoreList.length ? (completed / scoreList.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-300">
            ผู้ประเมิน: {data.evaluator.name} · {completed}/{scoreList.length}{" "}
            คะแนน
          </p>
        </header>
        <p className="mt-4 px-1 text-xs text-gray-500">
          แตะ 1–5 หรือ N/A · กด + เพื่อใส่หมายเหตุ
        </p>
        {!data.week.isFriday ? (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            เปิดดูได้ทุกวัน แต่ส่งแบบประเมินได้เฉพาะวันศุกร์
          </p>
        ) : null}
        {data.locked ? (
          <p className="mt-3 rounded-xl bg-gray-200 p-3 text-sm text-gray-700">
            แบบประเมินสัปดาห์นี้ถูกล็อกหลังเช็กเอาต์แล้ว
          </p>
        ) : null}
        <div className="mt-3 space-y-3">
          {data.topics.map((topic) => (
            <section
              key={topic.topicId}
              className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm"
            >
              <div className="bg-[#172033] px-4 py-3 text-white">
                <h2 className="text-sm font-semibold">{topic.title}</h2>
                <p className="mt-0.5 text-[10px] text-slate-300">
                  {topic.description}
                </p>
              </div>
              {data.employees
                .filter((employee) =>
                  topic.employeeIds.includes(employee.employeeId),
                )
                .map((employee) => {
                  const k = keyOf(employee.employeeId, topic.topicId);
                  const item = scores[k];
                  return (
                    <div
                      key={employee.employeeId}
                      className="flex items-center gap-2 border-b border-gray-100 px-2 py-2 last:border-0"
                    >
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700">
                        {employee.name.slice(0, 1)}
                      </div>
                      <span className="w-[58px] truncate text-[12px] font-medium">
                        {employee.name}
                      </span>
                      <div className="flex min-w-0 flex-1 justify-end gap-1">
                        <button
                          disabled={data.locked || !data.week.isFriday}
                          onClick={() =>
                            setScore(employee.employeeId, topic.topicId, null)
                          }
                          className={`h-8 rounded-lg px-1.5 text-[9px] font-semibold disabled:opacity-50 ${item?.answered && item.score === null ? "bg-[#1972BC] text-white shadow" : "bg-gray-100 text-gray-600"}`}
                        >
                          N/A
                        </button>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            disabled={data.locked || !data.week.isFriday}
                            key={value}
                            onClick={() =>
                              setScore(
                                employee.employeeId,
                                topic.topicId,
                                value,
                              )
                            }
                            className={`h-8 w-8 rounded-lg text-[11px] font-semibold disabled:opacity-50 ${item?.score === value ? "bg-[#1972BC] text-white shadow" : "bg-gray-100 text-gray-600"}`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <button
                        disabled={data.locked || !data.week.isFriday}
                        onClick={() => setNoteKey(k)}
                        aria-label={`หมายเหตุ ${employee.name}`}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-base font-semibold ${item?.note ? "border-[#1972BC] bg-[#1972BC] text-white" : "border-blue-200 bg-blue-50 text-[#1972BC]"}`}
                      >
                        +
                      </button>
                      {item?.score !== null &&
                      item?.score <= 2 &&
                      !item.note.trim() ? (
                        <span className="sr-only">ต้องใส่หมายเหตุ</span>
                      ) : null}
                    </div>
                  );
                })}
            </section>
          ))}
        </div>
        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 px-3">
          <button
            disabled={!canReview}
            onClick={() => setReviewing(true)}
            className="mx-auto flex h-12 w-full max-w-lg items-center justify-center rounded-2xl bg-[#1972BC] font-semibold text-white shadow-xl disabled:bg-gray-300"
          >
            ตรวจสอบคะแนนทั้งหมด
          </button>
        </div>
      </div>
      {noteKey && activeNote ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 sm:items-center sm:justify-center">
          <section className="w-full max-w-lg rounded-[24px] bg-white p-5 shadow-2xl">
            <div className="flex justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  หมายเหตุ · {activeEmployee?.name}
                </h2>
                <p className="text-xs text-gray-500">
                  {activeTopic?.title} ·{" "}
                  {activeNote.score
                    ? `${activeNote.score} คะแนน`
                    : "ยังไม่ให้คะแนน"}
                </p>
              </div>
              <button
                onClick={() => setNoteKey(null)}
                className="h-9 w-9 rounded-full bg-gray-100"
              >
                ×
              </button>
            </div>
            <textarea
              value={activeNote.note}
              maxLength={500}
              onChange={(event) =>
                setScores((previous) => ({
                  ...previous,
                  [noteKey]: { ...previous[noteKey], note: event.target.value },
                }))
              }
              rows={5}
              className="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-base outline-none focus:border-[#1972BC]"
              placeholder="ใส่รายละเอียดเพิ่มเติม…"
            />
            {activeNote.score !== null && activeNote.score <= 2 ? (
              <p className="mt-2 text-xs text-red-600">
                คะแนน 1–2 ต้องระบุเหตุผล
              </p>
            ) : null}
            <button
              onClick={() => setNoteKey(null)}
              className="mt-4 h-12 w-full rounded-2xl bg-[#1972BC] font-semibold text-white"
            >
              บันทึกหมายเหตุ
            </button>
          </section>
        </div>
      ) : null}
      {reviewing ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 sm:items-center sm:justify-center">
          <section className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-[24px] bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold">ตรวจสอบก่อนส่ง</h2>
            <p className="mt-1 text-sm text-gray-500">
              ครบแล้ว {scoreList.length} คะแนน · หมายเหตุ{" "}
              {scoreList.filter((item) => item.note).length} รายการ
            </p>
            <div className="mt-4 space-y-2">
              {data.topics.map((topic) => {
                const values = scoreList
                  .filter(
                    (item) =>
                      item.topicId === topic.topicId && item.score !== null,
                  )
                  .map((item) => item.score as number);
                const average = values.length
                  ? values.reduce((a, b) => a + b, 0) / values.length
                  : 0;
                return (
                  <div
                    key={topic.topicId}
                    className="flex justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span>{topic.title}</span>
                    <b className="text-[#1972BC]">{average.toFixed(1)}</b>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              หลังส่งยังแก้ได้จนกว่าจะเช็กเอาต์
            </p>
            <button
              disabled={saving}
              onClick={submit}
              className="mt-4 h-12 w-full rounded-2xl bg-[#1972BC] font-semibold text-white disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก…" : "ยืนยันและส่งแบบประเมิน"}
            </button>
            <button
              onClick={() => setReviewing(false)}
              className="mt-2 h-11 w-full text-sm font-medium text-[#1972BC]"
            >
              ← กลับไปแก้ไข
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
