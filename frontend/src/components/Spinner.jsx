// src/components/Spinner.jsx
import React from "react";

const SIZE_MAP = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export default function Spinner({ label, size = "md", className = "" }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={["flex flex-col items-center gap-3", className].join(" ")}>
      <div
        className={[
          "rounded-full border-white/20 border-t-white animate-spin",
          sizeClass,
        ].join(" ")}
      />
      {label ? <div className="text-sm text-slate-300">{label}</div> : null}
    </div>
  );
}
