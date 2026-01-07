// src/components/AuthCard.jsx
function AuthCard({ title, children, onBack, topRight }) {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      {/* ✅ Top-right slot (outside card) */}
      {topRight ? (
        <div className="absolute top-4 right-4 z-20">{topRight}</div>
      ) : null}

      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* App header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Training Tracker
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Stay consistent. Track your progress.
            </p>
          </div>

          {/* Card */}
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/15 shadow-2xl rounded-3xl p-6 sm:p-8 overflow-hidden">
            {/* subtle gradient edge */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-tr from-white/10 via-transparent to-white/20 opacity-40 pointer-events-none" />

            {/* ✅ decorative “life” blob (no image assets) */}
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

            <div className="relative">
              {/* Title + Back button row */}
              <div className="flex items-center mb-6">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="
                      mr-3 h-9 w-9 rounded-full
                      flex items-center justify-center
                      border border-white/15
                      bg-white/5 text-white
                      hover:bg-white/10
                      transition
                    "
                    aria-label="Go back"
                    title="Back"
                  >
                    ←
                  </button>
                ) : null}

                <h2 className="flex-1 text-xl font-medium text-white text-center">
                  {title}
                </h2>

                {/* Spacer to keep title centered when back button exists */}
                {onBack ? <div className="w-9" /> : null}
              </div>

              {children}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-500 mt-6">
            Designed for mobile • Looks great on desktop too
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthCard;
