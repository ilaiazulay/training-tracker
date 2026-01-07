export default function ProgressCard({
  workoutLabel,
  progressPct,
  progressText,
  totalTimeText,
  totalTimeUnit,
  currentExerciseName,
  onContinue,
}) {
  const pct = Math.max(0, Math.min(100, Number(progressPct || 0)));

  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-3 space-y-3">
      <button
        type="button"
        onClick={onContinue}
        className="relative w-full text-left rounded-3xl overflow-hidden active:scale-[0.99] transition"
        style={{
          background: "linear-gradient(135deg, #7CFF5B 0%, #1EEA7A 100%)",
        }}
        aria-label="Continue workout"
        title="Continue workout"
      >
        {/* brightness + glass */}
        <div className="absolute inset-0 bg-white/12 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/10 to-black/15 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-white/30 rounded-3xl pointer-events-none" />

        <div className="relative p-4">
          {/* BIGGER TITLE */}
          <div
            className="
              text-white
              text-xl
              font-extrabold
              tracking-tight
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]
            "
          >
            Workout in Progress
          </div>

          {/* WORKOUT ROW */}
          <div className="mt-2 flex items-center gap-3">
            {/* Play button like mock: soft circle, minimal border */}
            <span
              className="
                relative
                inline-flex
                h-9 w-9
                items-center justify-center
                rounded-full
                bg-white/30
                shadow-sm
              "
            >
              {/* triangle */}
              <span
                className="
                  block
                  w-0 h-0
                  border-t-[6px] border-t-transparent
                  border-b-[6px] border-b-transparent
                  border-l-[10px] border-l-white/95
                  translate-x-[1px]
                  drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]
                "
              />
            </span>

            <div
              className="
                text-white
                text-lg
                font-extrabold
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]
              "
            >
              {workoutLabel}
            </div>
          </div>

          {/* PROGRESS */}
          <div className="mt-3">
            <div className="h-2.5 rounded-full bg-black/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/95"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div
              className="
                mt-2
                text-xs
                font-semibold
                text-white
                drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]
              "
            >
              {progressText}
            </div>
          </div>
        </div>
      </button>

      {/* STATS (part of in-progress block) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
          <div className="text-xs font-medium text-slate-300">Total Time</div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-white text-3xl font-extrabold leading-none">
              {totalTimeText || "—"}
            </div>
            <div className="text-xs font-medium text-slate-400 mb-1">
              {totalTimeUnit || "mins"}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
          <div className="text-xs font-medium text-slate-300">Current Exercise</div>
          <div className="mt-2 text-white text-2xl font-extrabold leading-tight">
            {currentExerciseName || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
