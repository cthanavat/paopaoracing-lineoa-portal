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
}

const UserProfile: React.FC<UserProfileProps> = ({
  displayName,
  pictureUrl,
  statusMessage,
  bio,
  compact = false,
}) => {
  const [imageSrc, setImageSrc] = useState(
    pictureUrl || "/placeholder-avatar.svg",
  );

  return (
    <div
      className={`flex items-center ${compact ? "justify-start gap-3" : "mt-8 mb-2 justify-center"}`}
    >
      <div
        className={`relative overflow-hidden rounded-full ${compact ? "h-11 w-11" : "h-20 w-20"}`}
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
      <div className={compact ? "min-w-0" : "ml-4"}>
        <h2 className={`${compact ? "text-sm" : "text-lg"} font-semibold`}>
          {displayName}
        </h2>
        {statusMessage && (
          <p
            className={`${compact ? "text-xs" : "text-sm"} text-gray-600`}
          >
            {statusMessage}
          </p>
        )}
        {bio && (
          <p className={`${compact ? "text-xs" : "text-sm"} text-gray-600`}>
            {bio}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
