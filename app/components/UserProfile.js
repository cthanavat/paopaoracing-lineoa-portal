"use client";

import Image from "next/image";

export default function UserProfile({
  displayName,
  pictureUrl,
  statusMessage,
}) {
  return (
    <div className="mt-8 mb-2 flex items-center justify-center">
      <div className="relative h-20 w-20 overflow-hidden rounded-full">
        <Image
          src={pictureUrl || "/placeholder-avatar.png"}
          alt={displayName}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <div className="ml-4">
        <h2 className="text-lg font-semibold">{displayName}</h2>
        {statusMessage && (
          <p className="text-sm text-gray-600">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
