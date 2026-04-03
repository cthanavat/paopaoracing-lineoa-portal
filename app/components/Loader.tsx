"use client";

import React from "react";

const Loader: React.FC = () => {
  return (
    <div className="loader-shell" role="status" aria-live="polite">
      <div className="loader-spinner" />
    </div>
  );
};

export default Loader;
