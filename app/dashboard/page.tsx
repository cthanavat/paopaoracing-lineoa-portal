"use client";

import { startTransition, useDeferredValue, useState } from "react";
import {
  HiArrowTrendingUp,
  HiBanknotes,
  HiClipboardDocumentList,
  HiClock,
  HiCog6Tooth,
  HiMagnifyingGlass,
  HiTruck,
  HiWrenchScrewdriver,
} from "react-icons/hi2";
import { useAppStore } from "@/store/useAppStore";
import UserProfile from "../components/UserProfile";

type JobStatus =
  | "รับคิว"
  | "กำลังทำ"
  | "รออะไหล่"
  | "รอติดตั้ง"
  | "รอส่งรถ"
  | "ปิดงาน";

interface StoreJob {
  id: string;
  customer: string;
  car: string;
  service: string;
  slot: string;
  deposit: string;
  status: JobStatus;
  assignee: string;
  eta: string;
}

interface BillRow {
  billNo: string;
  customer: string;
  total: string;
  payment: string;
  due: string;
  state: "มัดจำ" | "รอชำระ" | "ชำระแล้ว";
}

const kpiItems = [
  {
    label: "รถอยู่ในร้าน",
    value: "12 คัน",
    note: "รวมงานติดตั้งและงานรอส่ง",
    icon: HiTruck,
  },
  {
    label: "คิววันนี้",
    value: "8 งาน",
    note: "รับคิวใหม่ 3 งาน",
    icon: HiClock,
  },
  {
    label: "ยอดขายวันนี้",
    value: "฿74,500",
    note: "+12% จากเมื่อวาน",
    icon: HiArrowTrendingUp,
  },
  {
    label: "ยอดมัดจำคงค้าง",
    value: "฿31,000",
    note: "มี 4 คันรอติดตั้ง",
    icon: HiBanknotes,
  },
];

const jobs: StoreJob[] = [
  {
    id: "JB-2401",
    customer: "คุณก้อง",
    car: "Civic FE / 2ขก 8821",
    service: "ชุดคอยล์โอเวอร์ + ตั้งศูนย์",
    slot: "09:00",
    deposit: "฿10,000",
    status: "กำลังทำ",
    assignee: "ช่างเอ็ม",
    eta: "15:30",
  },
  {
    id: "JB-2402",
    customer: "คุณบอล",
    car: "Hilux Revo / 3ฒญ 2290",
    service: "เบรกหน้า-หลัง + ไล่น้ำมัน",
    slot: "10:30",
    deposit: "฿0",
    status: "รับคิว",
    assignee: "ทีมหน้าร้าน",
    eta: "12:00",
  },
  {
    id: "JB-2403",
    customer: "คุณอาร์ม",
    car: "Yaris Ativ / 9กน 1182",
    service: "ล้อแม็ก + ยาง 4 เส้น",
    slot: "11:00",
    deposit: "฿5,000",
    status: "รออะไหล่",
    assignee: "จัดซื้อ",
    eta: "พรุ่งนี้ 14:00",
  },
  {
    id: "JB-2404",
    customer: "คุณน็อต",
    car: "Fortuner / 1กข 4567",
    service: "อินเตอร์ + ท่อสเตนเลส",
    slot: "13:00",
    deposit: "฿8,000",
    status: "รอติดตั้ง",
    assignee: "ช่างตี๋",
    eta: "30 มี.ค. 10:00",
  },
  {
    id: "JB-2405",
    customer: "คุณต้น",
    car: "Accord G11 / 7ขว 9081",
    service: "เซ็ตช่วงล่างและบาลานซ์",
    slot: "15:30",
    deposit: "฿0",
    status: "รอส่งรถ",
    assignee: "แอดมินแคชเชียร์",
    eta: "วันนี้ 18:30",
  },
  {
    id: "JB-2406",
    customer: "คุณเบส",
    car: "Vios / 4กต 6734",
    service: "เปลี่ยนโช้ค + จัดทรง",
    slot: "08:45",
    deposit: "฿0",
    status: "ปิดงาน",
    assignee: "ช่างบอย",
    eta: "ส่งแล้ว",
  },
];

const bills: BillRow[] = [
  {
    billNo: "INV-90018",
    customer: "คุณก้อง",
    total: "฿29,500",
    payment: "โอน + เงินสด",
    due: "คงเหลือ ฿19,500",
    state: "มัดจำ",
  },
  {
    billNo: "INV-90019",
    customer: "คุณต้น",
    total: "฿7,800",
    payment: "เงินสด",
    due: "รอรับรถภายในวันนี้",
    state: "รอชำระ",
  },
  {
    billNo: "INV-90020",
    customer: "คุณเบส",
    total: "฿12,400",
    payment: "บัตรเครดิต",
    due: "ปิดบิลแล้ว",
    state: "ชำระแล้ว",
  },
];

const taskGroups = [
  {
    title: "ต้องตามทันที",
    items: [
      "โทรยืนยันคิวคุณบอลก่อน 10:00",
      "เช็กสถานะส่งคอยล์โอเวอร์ของคุณอาร์ม",
      "เตรียมใบรับรถและสรุปค่าใช้จ่ายของคุณต้น",
    ],
  },
  {
    title: "งานหน้าร้าน",
    items: [
      "อัปเดตรูปรถก่อน-หลังติดตั้งลง LINE OA",
      "เช็กสต็อกน้ำมันเบรกและจาระบี",
      "เตรียมพื้นที่ส่งมอบรถช่วงเย็น",
    ],
  },
];

const salesSummary = [
  { label: "อะไหล่และของแต่ง", value: "฿48,000", share: "64%" },
  { label: "ค่าแรงติดตั้ง", value: "฿17,500", share: "24%" },
  { label: "งานบริการหน้าร้าน", value: "฿9,000", share: "12%" },
];

const statusFilters: Array<JobStatus | "ทั้งหมด"> = [
  "ทั้งหมด",
  "รับคิว",
  "กำลังทำ",
  "รออะไหล่",
  "รอติดตั้ง",
  "รอส่งรถ",
  "ปิดงาน",
];

const statusStyles: Record<JobStatus, string> = {
  รับคิว: "bg-white/8 text-white ring-1 ring-white/15",
  กำลังทำ: "bg-amber-300 text-black",
  รออะไหล่: "bg-rose-500/90 text-white",
  รอติดตั้ง: "bg-sky-400 text-slate-950",
  รอส่งรถ: "bg-emerald-400 text-slate-950",
  ปิดงาน: "bg-white text-slate-950",
};

export default function DashboardPage() {
  const { member, employee, user } = useAppStore();
  const [selectedStatus, setSelectedStatus] =
    useState<JobStatus | "ทั้งหมด">("ทั้งหมด");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const keyword = deferredSearchTerm.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus =
      selectedStatus === "ทั้งหมด" || job.status === selectedStatus;
    const matchesSearch =
      !keyword ||
      [job.customer, job.car, job.service, job.id]
        .join(" ")
        .toLowerCase()
        .includes(keyword);

    return matchesStatus && matchesSearch;
  });

  if (!member || member.userRole !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-white">
        <div className="max-w-sm text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-white/45">
            Store Dashboard
          </p>
          <h1 className="mt-4 text-2xl font-semibold">หน้านี้สำหรับผู้ดูแลร้าน</h1>
          <p className="mt-3 text-sm text-white/65">
            เมื่อบัญชีมีสิทธิ์แอดมิน จะเห็นภาพรวมบิล คิวงาน และงานที่ต้องตามต่อได้จากที่นี่
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] pb-28 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.22),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-8 pt-6 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/45">
                Front Store Control
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
                คุมคิวรถ งานช่าง บิลขาย และงานรอติดตั้งจากหน้าจอเดียว
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                ใช้หน้านี้เป็นศูนย์กลางของหน้าร้านแต่งรถยนต์ สำหรับเช็กคิวรับรถ สถานะติดตั้ง
                มัดจำ งานค้างส่ง และภาพรวมรายได้ของวัน
              </p>
            </div>

            <div className="self-end rounded-[28px] border border-white/12 bg-white/[0.04] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <UserProfile
                pictureUrl={user?.pictureUrl}
                displayName={employee?.nickname || user?.displayName || "Admin"}
                statusMessage={`${employee?.firstname || ""} ${employee?.lastname || ""}`.trim()}
                bio={employee?.role || "ผู้ดูแลร้าน"}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    รถพร้อมส่ง
                  </p>
                  <p className="mt-2 text-3xl font-semibold">3 คัน</p>
                  <p className="mt-1 text-sm text-white/55">
                    ต้องปิดบิลก่อน 18:30
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-rose-100/70">
                    งานรออะไหล่
                  </p>
                  <p className="mt-2 text-3xl font-semibold">2 งาน</p>
                  <p className="mt-1 text-sm text-rose-100/70">
                    มี 1 งานต้องโทรอัปเดตลูกค้าวันนี้
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {kpiItems.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/55">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <Icon className="h-5 w-5 text-white/80" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/55">{item.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[30px] border border-white/10 bg-[#111111] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Work Queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold">รายการงานและสถานะรถ</h2>
              <p className="mt-2 text-sm text-white/55">
                ดูคิวรถตั้งแต่รับงานจนถึงส่งมอบ พร้อมค้นหาจากลูกค้า รุ่นรถ หรือเลขงาน
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      startTransition(() => setSelectedStatus(status))
                    }
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      selectedStatus === status
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <label className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60 lg:w-[320px]">
                <HiMagnifyingGlass className="h-4 w-4" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ค้นหาลูกค้า / รถ / เลขงาน"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filteredJobs.map((job) => (
              <article
                key={job.id}
                className="grid gap-4 rounded-[26px] border border-white/8 bg-white/[0.03] p-4 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.055] lg:grid-cols-[1.1fr_0.85fr_0.55fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.24em] text-white/35">
                      {job.id}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[job.status]}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{job.customer}</h3>
                  <p className="mt-1 text-sm text-white/55">{job.car}</p>
                  <p className="mt-4 text-sm leading-6 text-white/75">
                    {job.service}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm text-white/65">
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-xs uppercase tracking-[0.22em] text-white/35">
                      รับคิว
                    </dt>
                    <dd className="mt-2 font-medium text-white">{job.slot}</dd>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-xs uppercase tracking-[0.22em] text-white/35">
                      มัดจำ
                    </dt>
                    <dd className="mt-2 font-medium text-white">{job.deposit}</dd>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-xs uppercase tracking-[0.22em] text-white/35">
                      ผู้รับผิดชอบ
                    </dt>
                    <dd className="mt-2 font-medium text-white">{job.assignee}</dd>
                  </div>
                  <div className="rounded-2xl bg-black/25 p-3">
                    <dt className="text-xs uppercase tracking-[0.22em] text-white/35">
                      ETA
                    </dt>
                    <dd className="mt-2 font-medium text-white">{job.eta}</dd>
                  </div>
                </dl>

                <div className="flex flex-col justify-between rounded-[22px] border border-dashed border-white/12 bg-black/25 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                      next action
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/75">
                      {job.status === "รับคิว" && "ยืนยันงานและส่งใบประเมินก่อนเริ่มงาน"}
                      {job.status === "กำลังทำ" && "อัปเดตรูปความคืบหน้าให้ลูกค้าก่อนช่วงบ่าย"}
                      {job.status === "รออะไหล่" && "ประสานร้านอะไหล่และแจ้งเวลานัดใหม่"}
                      {job.status === "รอติดตั้ง" && "เช็กอะไหล่ครบชุดและล็อกคิวช่าง"}
                      {job.status === "รอส่งรถ" && "ปิดบิล เตรียมเอกสารรับรถ และนัดเวลามารับ"}
                      {job.status === "ปิดงาน" && "ส่งสรุปงานและติดตามรีวิวหลังใช้บริการ"}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/35">
                    <HiWrenchScrewdriver className="h-4 w-4" />
                    Store operation
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                  Billing
                </p>
                <h2 className="mt-2 text-2xl font-semibold">รายการบิล</h2>
              </div>
              <HiClipboardDocumentList className="h-6 w-6 text-white/45" />
            </div>
            <div className="mt-5 space-y-3">
              {bills.map((bill) => (
                <div
                  key={bill.billNo}
                  className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                        {bill.billNo}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">
                        {bill.customer}
                      </h3>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                      {bill.state}
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold">{bill.total}</p>
                  <p className="mt-1 text-sm text-white/55">{bill.payment}</p>
                  <p className="mt-4 text-sm text-white/70">{bill.due}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                  Sales Report
                </p>
                <h2 className="mt-2 text-2xl font-semibold">รายงานการขาย</h2>
              </div>
              <HiArrowTrendingUp className="h-6 w-6 text-white/45" />
            </div>

            <div className="mt-5 space-y-4">
              {salesSummary.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{item.label}</span>
                    <span className="font-medium text-white">{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#fb7185,#facc15,#38bdf8)]"
                      style={{ width: item.share }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">
                รายได้คาดการณ์สิ้นวัน
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">฿96,800</p>
              <p className="mt-2 text-sm text-emerald-100/70">
                หากปิดบิลรถที่รอส่งครบทั้งหมด
              </p>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-[#101010] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                  Store Tasks
                </p>
                <h2 className="mt-2 text-2xl font-semibold">รายการงาน</h2>
              </div>
              <HiCog6Tooth className="h-6 w-6 text-white/45" />
            </div>

            <div className="mt-5 space-y-5">
              {taskGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-medium text-white/80">
                    {group.title}
                  </h3>
                  <div className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-white/70"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
