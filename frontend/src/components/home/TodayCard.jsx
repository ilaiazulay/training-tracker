function workoutLabel(k) {
  if (!k) return "";
  if (k === "FULL") return "Workout Full Body";
  return `Workout ${k}`;
}

export default function TodayCard({
  recommended,
  dayKeys,
  selected,
  onChangeSelected,

  // IMPORTANT: this should be "active workout matches selected workout"
  hasActiveForSelected,

  busy,
  onContinue,
  onNewWorkout,
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-white font-semibold">Today</div>
          <div className="text-xs text-slate-400 mt-1">
            Recommended: <span className="text-slate-200">{recommended}</span>
          </div>
        </div>

        <select
          className="bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          value={selected}
          onChange={(e) => onChangeSelected(e.target.value)}
        >
          {dayKeys.map((k) => (
            <option key={k} value={k} className="bg-slate-900 text-white">
              {workoutLabel(k)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {hasActiveForSelected ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={busy}
            className="w-full bg-emerald-400 text-slate-900 font-semibold py-2.5 rounded-xl text-sm hover:bg-emerald-300 active:scale-[0.99] transition disabled:opacity-60"
          >
            Continue workout
          </button>
        ) : null}

        <button
          type="button"
          onClick={onNewWorkout}
          disabled={busy}
          className={[
            "w-full font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-60",
            hasActiveForSelected
              ? "bg-white/10 text-white border border-white/15 hover:bg-white/15"
              : "bg-emerald-400 text-slate-900 hover:bg-emerald-300 active:scale-[0.99]",
          ].join(" ")}
        >
          {busy
            ? "Please wait..."
            : hasActiveForSelected
            ? "New workout"
            : "Start workout"}
        </button>
      </div>
    </div>
  );
}
