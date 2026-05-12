import React from "react";

function AthleteAvatar({ athlete, size = "md" }) {
  const initials = athlete?.name
    ? athlete.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  return (
    <div
      className={`${sizeClasses[size] || sizeClasses.md} rounded-full bg-orange-500 text-white flex items-center justify-center font-bold`}
    >
      {athlete?.image ? (
        <img
          src={athlete.image}
          alt={athlete.name || "Athlete"}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

export { AthleteAvatar };
export default AthleteAvatar;
