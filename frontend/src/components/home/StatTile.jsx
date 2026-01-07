export default function StatTile({ label, value, unit, icon, big }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-300">{label}</div>
        <div className="text-slate-300">{icon}</div>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <div
          className={[
            "text-white font-semibold leading-none",
            big ? "text-2xl" : "text-3xl",
          ].join(" ")}
        >
          {value}
        </div>
        {unit ? <div className="text-xs text-slate-400 mb-1">{unit}</div> : null}
      </div>
    </div>
  );
}
