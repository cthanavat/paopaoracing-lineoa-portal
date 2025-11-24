"use client";

import Image from "next/image";
import React from "react";

interface UserProfileProps {
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  bio?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({
  displayName,
  pictureUrl,
  statusMessage,
  bio,
}) => {
  return (
    <div className="mt-8 mb-2 flex items-center justify-center">
      <div className="relative h-20 w-20 overflow-hidden rounded-full">
        <Image
          src={pictureUrl || "/placeholder-avatar.png"}
          alt={displayName}
          fill
          sizes="56px"
          className="object-cover"
          priority
        />
      </div>
      <div className="ml-4">
        <h2 className="text-lg font-semibold">{displayName}</h2>
        {statusMessage && (
          <p className="text-sm text-gray-600">{statusMessage}</p>
        )}
        {bio && <p className="text-sm text-gray-600">{bio}</p>}
      </div>
    </div>
  );
};

export default UserProfile;
