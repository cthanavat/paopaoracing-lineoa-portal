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
      <div className="flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xs min-w-2xs px-4">
      <Timeline>
        {historyList.map((bill, idx) => (
          <TimelineItem key={idx} className="mx-auto mb-1 ml-4">
            <TimelinePoint />
            <TimelineContent>
              <TimelineTime className="text-blue-700 italic">
                {bill.bill_date}
              </TimelineTime>
              <TimelineTitle className="text-md">
                {bill.car_plate_number + ": " + bill.bill_total_amount || "-"}
              </TimelineTitle>
              <TimelineBody className="pl-2 text-sm whitespace-pre-line">
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
