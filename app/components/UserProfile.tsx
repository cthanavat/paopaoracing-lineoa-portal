"use client";

import Image from "next/image";
import React from "react";
import { useState } from "react";

interface UserProfileProps {
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  bio?: string;
  compact?: boolean;
  tone?: "light" | "nav";
}

const UserProfile: React.FC<UserProfileProps> = ({
  displayName,
  pictureUrl,
  statusMessage,
  bio,
  compact = false,
  tone = "light",
}) => {
  const [imageSrc, setImageSrc] = useState(
    pictureUrl || "/placeholder-avatar.svg",
  );

  const isNavTone = tone === "nav";

  return (
    <div
      className={`flex items-center ${compact ? "justify-start gap-3" : "justify-center gap-3.5"}`}
    >
      <div
        className={`relative overflow-hidden rounded-full ring-1 ${
          compact ? "h-12 w-12" : "h-16 w-16"
        } ${isNavTone ? "ring-white/18" : "ring-[#d4d9e1]"}`}
      >
        <Image
          src={imageSrc}
          alt={displayName}
          fill
          sizes="56px"
          className="object-cover"
          priority
          onError={() => setImageSrc("/placeholder-avatar.svg")}
        />
      </div>
      <div className="min-w-0 space-y-0.5">
        <h2
          className={`${compact ? "text-[15px]" : "text-[1.05rem]"} truncate font-semibold leading-tight ${
            isNavTone ? "text-white" : "text-gray-950"
          }`}
        >
          {displayName}
        </h2>
        {statusMessage && (
          <p
            className={`${compact ? "text-[12px]" : "text-[13px]"} truncate ${
              isNavTone ? "text-slate-300" : "text-gray-600"
            }`}
          >
            {statusMessage}
          </p>
        )}
        {bio && (
          <p
            className={`${compact ? "text-[11px]" : "text-[12px]"} truncate ${
              isNavTone ? "text-slate-400" : "text-gray-500"
            }`}
          >
            {bio}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
