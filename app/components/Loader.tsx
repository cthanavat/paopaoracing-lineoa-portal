"use client";

import React from "react";

type LoaderProps = {
  title?: string;
  detail?: string;
  steps?: string[];
  activeStep?: number;
};

const Loader: React.FC<LoaderProps> = ({
  title,
  detail,
  steps,
  activeStep = 0,
}) => {
  const safeStep = steps?.length
    ? Math.min(Math.max(activeStep, 0), steps.length - 1)
    : 0;
  const visibleSteps = steps?.length
    ? [
        { text: steps[safeStep], index: safeStep, isActive: true },
        ...(safeStep > 0
          ? [
              {
                text: steps[safeStep - 1],
                index: safeStep - 1,
                isActive: false,
              },
            ]
          : []),
      ]
    : [];

  return (
    <div
      className="loader-shell flex-col gap-3 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="loader-wave" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      {visibleSteps?.length ? (
        <div className="loader-steps max-w-[19rem] px-4">
          {visibleSteps.map((step) => (
            <p
              key={`${step.index}-${step.text}`}
              className={`loader-step ${step.isActive ? "loader-step-active" : "loader-step-previous"}`}
            >
              {step.text}
            </p>
          ))}
        </div>
      ) : title || detail ? (
        <div className="max-w-[18rem] space-y-1 px-4">
          {title ? (
            <p className="text-sm font-bold text-current">{title}</p>
          ) : null}
          {detail ? (
            <p className="text-xs leading-5 text-[#aeb3ba]">{detail}</p>
          ) : null}
        </div>
      ) : (
        <span className="sr-only">กำลังโหลด</span>
      )}
    </div>
  );
};

export default Loader;
