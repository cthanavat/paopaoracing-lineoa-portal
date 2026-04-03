"use client";

import React from "react";
import {
  Timeline,
  TimelineBody,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
} from "flowbite-react";
import { useAppStore } from "@/store/useAppStore";
import Loader from "./Loader";

const HistoryView: React.FC = () => {
  const { historyList, loadHistory } = useAppStore();

  if (loadHistory) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full px-1">
      <Timeline
        theme={{
          root: {
            direction: {
              vertical: "relative border-l-2 border-[#c6d1df]",
            },
          },
          item: {
            point: {
              marker: {
                base: {
                  vertical:
                    "absolute -left-[0.5rem] mt-1.5 h-4 w-4 rounded-full border-2 border-white bg-[#8ba4c8]",
                },
              },
            },
          },
        }}
      >
        {historyList.map((bill, idx) => (
          <TimelineItem key={idx} className="mb-2 ml-4">
            <TimelinePoint />
            <TimelineContent>
              <TimelineTime className="text-[12px] font-medium text-blue-700">
                {bill.bill_date}
              </TimelineTime>
              <TimelineTitle className="text-[15px] leading-tight font-semibold text-gray-900">
                {bill.car_plate_number + ": " + bill.bill_total_amount || "-"}
              </TimelineTitle>
              <TimelineBody className="pl-1.5 text-[13px] leading-5 text-gray-600 whitespace-pre-line">
                {bill.bill_detail}
              </TimelineBody>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </div>
  );
};

export default HistoryView;
