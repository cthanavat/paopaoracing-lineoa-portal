"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HiArrowLeft, HiPlus, HiX } from "react-icons/hi";
import { authenticatedFetch } from "@/lib/utils/apiClient";
import {
  SERVICE_OPTIONS,
  buildServiceRequestFlexMessage,
  validateServiceRequest,
} from "@/lib/serviceRequest.mjs";
import { useAppStore } from "@/store/useAppStore";
import { NotificationState } from "@/types/ui";
import HistoryView from "./HistoryView";
import Loader from "./Loader";
import MemberIdentityTicket from "./MemberIdentityTicket";

interface MemberViewProps {
  sendMessage: (message: unknown) => Promise<boolean>;
  setNotification: React.Dispatch<React.SetStateAction<NotificationState>>;
  preview?: boolean;
  isAccessVerifying?: boolean;
}

interface Vehicle {
  vehicle_id: string;
  plate: string;
  brand: string;
  model: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface VehicleDraft {
  plate: string;
  brand: string;
  model: string;
}

const EMPTY_VEHICLE: VehicleDraft = { plate: "", brand: "", model: "" };

const formatToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const previewVehicles: Vehicle[] = [
  {
    vehicle_id: "preview-vigo",
    plate: "กฉ 1234",
    brand: "Toyota",
    model: "Vigo ปี12",
    active: true,
    created_at: "",
    updated_at: "",
  },
  {
    vehicle_id: "preview-civic",
    plate: "ขก 5678",
    brand: "Honda",
    model: "Civic ปี24",
    active: true,
    created_at: "",
    updated_at: "",
  },
];

const MemberView: React.FC<MemberViewProps> = ({
  sendMessage,
  setNotification,
  preview = false,
  isAccessVerifying = false,
}) => {
  const { user, member, isLiffReady, isInClient } = useAppStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [vehicleError, setVehicleError] = useState("");
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [newVehicle, setNewVehicle] = useState<VehicleDraft>(EMPTY_VEHICLE);
  const [flowError, setFlowError] = useState("");
  const [isServiceConfirming, setIsServiceConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  useEffect(() => {
    const closeDetail = () => setIsDetailClosing(true);
    window.addEventListener("paopao-member-detail-exit", closeDetail);
    return () =>
      window.removeEventListener("paopao-member-detail-exit", closeDetail);
  }, []);
  const isAnyModalOpen = isServiceOpen || isAddVehicleOpen;

  const loadVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    setVehicleError("");

    try {
      if (preview) {
        setVehicles(previewVehicles);
        setSelectedVehicleId(previewVehicles[0].vehicle_id);
        return;
      }

      const response = await authenticatedFetch(
        "/api/member/vehicles",
        undefined,
        { requireVerifiedToken: true },
      );
      const result = await response.json();
      if (!response.ok || !result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || "ไม่สามารถโหลดข้อมูลรถได้");
      }

      const activeVehicles = (result.data as Vehicle[]).filter(
        (vehicle) => vehicle.active,
      );
      setVehicles(activeVehicles);
      setSelectedVehicleId((current) =>
        activeVehicles.some((vehicle) => vehicle.vehicle_id === current)
          ? current
          : (activeVehicles[0]?.vehicle_id ?? ""),
      );
    } catch (error) {
      setVehicles([]);
      setVehicleError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลรถได้",
      );
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [preview]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    if (!isAnyModalOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const previousStyles = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previousStyles.position;
      body.style.top = previousStyles.top;
      body.style.width = previousStyles.width;
      body.style.overflow = previousStyles.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isAnyModalOpen]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.vehicle_id === selectedVehicleId),
    [selectedVehicleId, vehicles],
  );

  if (!member) return null;

  const isActionEnabled = preview || (isLiffReady && isInClient);
  const openServiceRequest = () => {
    setSelectedVehicleId((current) => current || vehicles[0]?.vehicle_id || "");
    setSelectedServices([]);
    setFlowError("");
    setIsServiceConfirming(false);
    setIsServiceOpen(true);
  };

  const closeServiceRequest = () => {
    if (isSubmitting) return;
    setIsServiceOpen(false);
    setIsServiceConfirming(false);
    setFlowError("");
  };

  const reviewServiceRequest = () => {
    const validationError = validateServiceRequest({
      plate: selectedVehicle?.plate ?? "",
      services: selectedServices,
    });
    if (validationError) {
      setFlowError(validationError);
      return;
    }
    setFlowError("");
    setIsServiceConfirming(true);
  };

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    );
    setFlowError("");
  };

  const openAddVehicle = () => {
    setEditingVehicleId("");
    setNewVehicle(EMPTY_VEHICLE);
    setFlowError("");
    setIsAddVehicleOpen(true);
  };

  const openEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.vehicle_id);
    setNewVehicle({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
    });
    setFlowError("");
    setIsAddVehicleOpen(true);
  };

  const closeVehicleEditor = () => {
    if (isSavingVehicle) return;
    setIsAddVehicleOpen(false);
    setEditingVehicleId("");
    setNewVehicle(EMPTY_VEHICLE);
    setFlowError("");
  };

  const saveVehicle = async () => {
    const draft = {
      plate: newVehicle.plate.trim(),
      brand: newVehicle.brand.trim(),
      model: newVehicle.model.trim(),
    };
    if (!draft.plate || !draft.brand || !draft.model) {
      setFlowError("กรุณากรอกทะเบียน ยี่ห้อ และรุ่นรถให้ครบ");
      return;
    }

    setIsSavingVehicle(true);
    setFlowError("");
    try {
      const isEditing = Boolean(editingVehicleId);
      let savedVehicle: Vehicle;
      if (preview) {
        const existingVehicle = vehicles.find(
          (vehicle) => vehicle.vehicle_id === editingVehicleId,
        );
        savedVehicle = {
          vehicle_id: editingVehicleId || `preview-${Date.now()}`,
          ...draft,
          active: existingVehicle?.active ?? true,
          created_at: existingVehicle?.created_at ?? "",
          updated_at: "",
        };
      } else {
        const response = await authenticatedFetch(
          "/api/member/vehicles",
          {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify({
              ...(isEditing ? { vehicle_id: editingVehicleId } : {}),
              ...draft,
            }),
          },
          { requireVerifiedToken: true },
        );
        const result = await response.json();
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || "ไม่สามารถบันทึกข้อมูลรถได้");
        }
        savedVehicle = result.data as Vehicle;
      }

      setVehicles((current) =>
        isEditing
          ? current.map((vehicle) =>
              vehicle.vehicle_id === savedVehicle.vehicle_id
                ? savedVehicle
                : vehicle,
            )
          : [savedVehicle, ...current],
      );
      setSelectedVehicleId(savedVehicle.vehicle_id);
      setNewVehicle(EMPTY_VEHICLE);
      setEditingVehicleId("");
      setIsAddVehicleOpen(false);
      setNotification({
        show: true,
        message: isEditing ? "แก้ไขรถเรียบร้อยแล้ว" : "เพิ่มรถเรียบร้อยแล้ว",
        type: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลรถได้";
      setFlowError(message);
      setNotification({ show: true, message, type: "error" });
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const submitServiceRequest = async () => {
    const plate = selectedVehicle?.plate ?? "";
    const validationError = validateServiceRequest({
      plate,
      services: selectedServices,
    });
    if (validationError) {
      setFlowError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFlowError("");
    try {
      const message = buildServiceRequestFlexMessage({
        date: formatToday(),
        phone: member.phone,
        plate,
        brand: selectedVehicle?.brand ?? "",
        model: selectedVehicle?.model ?? "",
        services: selectedServices,
      });
      const sent = await sendMessage(message);
      if (!sent) throw new Error("ส่งข้อความไม่สำเร็จ");

      setNotification({
        show: true,
        message: "ส่งคำขอเข้า LINE สำเร็จ",
        type: "success",
      });
      setIsServiceOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ส่งคำขอไม่สำเร็จ";
      setFlowError(message);
      setNotification({ show: true, message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "min-h-12 w-full rounded-[10px] border border-[#d8dce0] bg-white px-4 text-base text-[#191a1c] outline-none placeholder:text-[#7a7a7a] focus:border-[#1972bc] focus:ring-2 focus:ring-[#1972bc]/20";

  if (isHistoryOpen) {
    return (
      <div className="member-shell mx-auto box-border min-h-full w-full max-w-full bg-[#18191a] px-4 py-5 text-[#191a1c] sm:max-w-xl sm:px-6">
        <button
          type="button"
          onClick={() => setIsHistoryOpen(false)}
          className="flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm font-semibold text-white"
        >
          <HiArrowLeft className="h-5 w-5" />
          กลับ
        </button>
        <div className="ticket-section bg-[#ffffff] p-4">
          <HistoryView />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`member-shell mx-auto box-border min-h-full w-full max-w-full bg-[#18191a] px-4 pt-4 pb-6 text-[#191a1c] sm:max-w-xl sm:px-6 sm:pt-6 ${isAccessVerifying ? "member-access-verifying" : ""}`}
    >
      <MemberIdentityTicket user={user} member={member} />

      {isAccessVerifying ? (
        <section className="mt-3 bg-transparent px-4 py-3">
          <div className="flex justify-center text-white">
            <Loader
              steps={["กำลังเตรียมข้อมูลสมาชิก", "กำลังยืนยันการเข้าถึง"]}
              activeStep={1}
            />
          </div>
        </section>
      ) : null}

      {!isAccessVerifying ? (
        <div
          className={`member-detail-panel ${isDetailClosing ? "detail-panel-exit" : ""}`}
        >
          <button
            type="button"
            onClick={openServiceRequest}
            disabled={!isActionEnabled}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-[12px] bg-[#1972bc] px-5 text-base font-black text-white transition hover:bg-[#155f9d] focus-visible:ring-2 focus-visible:ring-[#1972bc]/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
          >
            เข้ารับบริการ
          </button>
          {!isActionEnabled ? (
            <p className="mt-2 text-center text-xs text-[#777]">
              เปิดผ่าน LINE เพื่อส่งคำขอรับบริการ
            </p>
          ) : null}

          <div className="ticket-stack mt-4">
            <section
              className="ticket-section bg-white px-4 pt-3 pb-7"
              aria-labelledby="vehicles-heading"
            >
              <div className="ticket-divider mb-2 flex items-center justify-between gap-3 pb-1">
                <h2
                  id="vehicles-heading"
                  className="text-lg font-black text-white"
                >
                  รถของฉัน
                </h2>
                <button
                  type="button"
                  onClick={openAddVehicle}
                  className="flex min-h-9 items-center gap-1 rounded-full px-1 text-sm font-bold text-[#38bdf8]"
                >
                  <HiPlus className="h-5 w-5" /> เพิ่มรถ
                </button>
              </div>

              {isLoadingVehicles ? (
                <div className="rounded-[22px] border border-[#303030] bg-[#151515] p-5 text-sm text-[#929292]">
                  กำลังโหลดข้อมูลรถ...
                </div>
              ) : vehicleError ? (
                <div className="rounded-[22px] border border-[#164e63] bg-[#071419] p-5">
                  <p className="text-sm text-[#7dd3fc]">{vehicleError}</p>
                  <button
                    type="button"
                    onClick={() => void loadVehicles()}
                    className="mt-3 min-h-11 rounded-full border border-[#38bdf8] px-5 text-sm font-bold text-white"
                  >
                    ลองอีกครั้ง
                  </button>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#3a3a3a] bg-[#101010] p-5 text-sm text-[#929292]">
                  ยังไม่มีรถ กด “เพิ่มรถ” เพื่อเริ่มต้น
                </div>
              ) : (
                <div className="space-y-3">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.vehicle_id}
                      type="button"
                      onClick={() => openEditVehicle(vehicle)}
                      aria-label={`แก้ไขรถ ${vehicle.brand} ${vehicle.model} ${vehicle.plate}`}
                      className="relative block w-full overflow-hidden rounded-[10px] border border-[#e2e4e7] bg-[#eceef0] px-3 py-2.5 pl-4 text-left transition focus-visible:ring-2 focus-visible:ring-[#1972bc]/30 focus-visible:outline-none active:scale-[0.99]"
                    >
                      <span className="absolute inset-y-0 left-0 w-1 bg-[#0fa01b]" />
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-[15px] leading-5 font-black text-[#191a1c]">
                          {vehicle.brand} · {vehicle.model}
                        </span>
                        <span className="shrink-0 text-sm leading-5 font-black text-[#191a1c]">
                          {vehicle.plate}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="ticket-section bg-white px-4 pt-7 pb-6">
              <HistoryView compact onShowAll={() => setIsHistoryOpen(true)} />
            </section>
          </div>
        </div>
      ) : null}

      {isServiceOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeServiceRequest();
          }}
        >
          <section className="max-h-[92dvh] w-full max-w-lg [touch-action:pan-y] overflow-y-auto overscroll-contain bg-transparent px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {isServiceConfirming ? (
              <div className="modal-ticket-stack ticket-stack drop-shadow-[0_18px_38px_rgba(0,0,0,0.28)]">
                <section className="ticket-section bg-white px-5 pt-5 pb-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.18em] text-[#1972bc]">
                        CONFIRM REQUEST
                      </p>
                      <h2
                        id="service-title"
                        className="mt-1 text-2xl font-black text-[#191a1c]"
                      >
                        ยืนยันคำขอบริการ
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeServiceRequest}
                      disabled={isSubmitting}
                      aria-label="ปิด"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eceef0] text-[#666]"
                    >
                      <HiX className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-5 rounded-[12px] bg-[#eceef0] px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[12px] font-semibold text-[#666]">
                        รถ
                      </span>
                      <span className="text-right text-sm font-black text-[#191a1c]">
                        {selectedVehicle?.brand} · {selectedVehicle?.model}
                        <br />
                        {selectedVehicle?.plate}
                      </span>
                    </div>
                    <div className="my-3 border-t border-[#d8dce0]" />
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[12px] font-semibold text-[#666]">
                        บริการ
                      </span>
                      <span className="text-right text-sm font-bold text-[#191a1c]">
                        {selectedServices.join(", ")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-[12px] leading-5 text-[#666]">
                    ระบบจะส่งคำขอนี้เข้า LINE
                    เพื่อให้ทางร้านติดต่อกลับและยืนยันคิว
                  </p>
                </section>
                <section className="ticket-section bg-white px-5 pt-7 pb-5">
                  {flowError ? (
                    <p className="mb-3 text-center text-sm font-semibold text-[#b42318]">
                      {flowError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={submitServiceRequest}
                    disabled={isSubmitting}
                    className="min-h-13 w-full rounded-full bg-[#191a1c] px-5 py-3.5 text-base font-black text-white disabled:opacity-50"
                  >
                    {isSubmitting ? "กำลังส่ง..." : "ยืนยันและส่งคำขอ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsServiceConfirming(false)}
                    disabled={isSubmitting}
                    className="mt-2 min-h-11 w-full rounded-full text-sm font-bold text-[#666]"
                  >
                    กลับไปแก้ไข
                  </button>
                </section>
              </div>
            ) : (
              <div className="modal-ticket-stack ticket-stack drop-shadow-[0_18px_38px_rgba(0,0,0,0.28)]">
                <section className="ticket-section bg-white px-5 pt-5 pb-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.18em] text-[#1972bc]">
                        SERVICE REQUEST
                      </p>
                      <h2
                        id="service-title"
                        className="mt-1 text-2xl font-black text-[#191a1c]"
                      >
                        เข้ารับบริการ
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeServiceRequest}
                      disabled={isSubmitting}
                      aria-label="ปิด"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eceef0] text-[#666]"
                    >
                      <HiX className="h-5 w-5" />
                    </button>
                  </div>

                  <fieldset className="mt-5 min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <legend className="text-sm font-black text-[#191a1c]">
                        เลือกรถ
                      </legend>
                      <button
                        type="button"
                        onClick={openAddVehicle}
                        className="flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-[#1972bc]"
                      >
                        <HiPlus className="h-4 w-4" /> เพิ่มรถ
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-[12px] bg-[#eceef0]">
                      {vehicles.map((vehicle, index) => {
                        const selected =
                          selectedVehicleId === vehicle.vehicle_id;
                        return (
                          <label
                            key={vehicle.vehicle_id}
                            className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 ${index ? "border-t border-[#d8dce0]" : ""} ${selected ? "bg-white" : ""}`}
                          >
                            <input
                              type="radio"
                              name="service-vehicle"
                              checked={selected}
                              onChange={() => {
                                setSelectedVehicleId(vehicle.vehicle_id);
                                setFlowError("");
                              }}
                              className="h-5 w-5 shrink-0 accent-[#1972bc]"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#191a1c]">
                              {vehicle.brand} · {vehicle.model}
                            </span>
                            <span className="shrink-0 text-sm font-black text-[#191a1c]">
                              {vehicle.plate}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </section>

                <section className="ticket-section bg-white px-5 pt-7 pb-5">
                  <fieldset>
                    <legend className="mb-2 text-sm font-black text-[#191a1c]">
                      เลือกรายการบริการ
                    </legend>
                    <div className="overflow-hidden rounded-[12px] bg-[#eceef0]">
                      {SERVICE_OPTIONS.map((service, index) => {
                        const selected = selectedServices.includes(service);
                        return (
                          <label
                            key={service}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-sm font-bold text-[#191a1c] ${index ? "border-t border-[#d8dce0]" : ""} ${selected ? "bg-white" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleService(service)}
                              className="h-5 w-5 rounded border-[#aeb4ba] accent-[#1972bc]"
                            />
                            {service}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {flowError ? (
                    <p className="mt-4 text-sm font-semibold text-[#b42318]">
                      {flowError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={reviewServiceRequest}
                    className="mt-5 min-h-13 w-full rounded-full bg-[#191a1c] px-5 py-3.5 text-base font-black text-white"
                  >
                    ตรวจสอบคำขอ
                  </button>
                </section>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isAddVehicleOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vehicle-editor-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeVehicleEditor();
          }}
        >
          <section className="max-h-[92dvh] w-full max-w-lg [touch-action:pan-y] overflow-y-auto overscroll-contain bg-transparent px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="modal-ticket-stack ticket-stack drop-shadow-[0_18px_38px_rgba(0,0,0,0.28)]">
              <section className="ticket-section bg-white px-5 pt-5 pb-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#1972bc]">
                      {editingVehicleId ? "EDIT VEHICLE" : "NEW VEHICLE"}
                    </p>
                    <h2
                      id="vehicle-editor-title"
                      className="mt-1 text-2xl font-black text-[#191a1c]"
                    >
                      {editingVehicleId ? "แก้ไขข้อมูลรถ" : "เพิ่มรถคันใหม่"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeVehicleEditor}
                    disabled={isSavingVehicle}
                    aria-label="ปิด"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eceef0] text-[#666] disabled:opacity-50"
                  >
                    <HiX className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  <input
                    value={newVehicle.plate}
                    onChange={(event) =>
                      setNewVehicle((vehicle) => ({
                        ...vehicle,
                        plate: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    aria-label="ทะเบียนรถ"
                    placeholder="ทะเบียนรถ"
                  />
                  <input
                    value={newVehicle.brand}
                    onChange={(event) =>
                      setNewVehicle((vehicle) => ({
                        ...vehicle,
                        brand: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    aria-label="ยี่ห้อรถ"
                    placeholder="ยี่ห้อรถ เช่น Toyota"
                  />
                  <input
                    value={newVehicle.model}
                    onChange={(event) =>
                      setNewVehicle((vehicle) => ({
                        ...vehicle,
                        model: event.target.value,
                      }))
                    }
                    className={inputClassName}
                    aria-label="รุ่นรถ"
                    placeholder="รุ่นรถ เช่น Vigo ปี12"
                  />
                  {flowError ? (
                    <p className="text-sm font-semibold text-[#b42318]">
                      {flowError}
                    </p>
                  ) : null}
                </div>
              </section>
              <section className="ticket-section bg-white px-5 pt-7 pb-5">
                <button
                  type="button"
                  onClick={saveVehicle}
                  disabled={isSavingVehicle}
                  className="min-h-13 w-full rounded-full bg-[#191a1c] px-5 py-3.5 text-base font-black text-white disabled:opacity-50"
                >
                  {isSavingVehicle
                    ? "กำลังบันทึก..."
                    : editingVehicleId
                      ? "บันทึกการแก้ไข"
                      : "บันทึกรถ"}
                </button>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default MemberView;
