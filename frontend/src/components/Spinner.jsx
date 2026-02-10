import React from "react";

export default function Spinner({
  label = "Loading...",
  size = "md", // "sm" | "md" | "lg"
  center = true,
}) {
  const box =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";

  const text =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  return (
    <div className={[center ? "flex justify-center" : "", "w-full"].join(" ")}>
      <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
        <span
          className={[
            box,
            "rounded-full border-2 border-slate-300 border-t-transparent animate-spin",
          ].join(" ")}
        />
        {label ? <span className={["text-slate-200", text].join(" ")}>{label}</span> : null}
      </div>
    </div>
  );
}
