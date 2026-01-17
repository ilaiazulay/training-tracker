import React from "react";

function AuthCard({ title, children, onBack, topRight, bottom }) {
  // If 'bottom' exists, it's an App page (Home/Stats/Settings)
  const isAppLayout = !!bottom;

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 font-sans">
      {/* Top Right Slot (Logout) */}
      {topRight ? <div className="absolute top-4 right-4 z-20">{topRight}</div> : null}

      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md flex flex-col">
          {/* Main App Title (Outside Card) */}
          <div className="mb-6 text-center shrink-0">
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Training Tracker
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Stay consistent. Track your progress.</p>
          </div>

          {/* CARD CONTAINER */}
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/15 shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[80vh] min-h-[600px] max-h-[800px]">
            {/* Background Decorations */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-tr from-white/10 via-transparent to-white/20 opacity-40 pointer-events-none" />
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

            {/* HEADER */}
            <div className="relative z-10 flex items-center p-6 pb-2 shrink-0">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="mr-3 h-9 w-9 rounded-full flex items-center justify-center border border-white/15 bg-white/5 text-white hover:bg-white/10 transition"
                >
                  ←
                </button>
              ) : null}

              <h2 className="flex-1 text-xl font-medium text-white text-center">{title}</h2>
              {onBack ? <div className="w-9" /> : null}
            </div>

            {/* CONTENT (scrollable only area) */}
            <div
              className={[
                "relative z-10 w-full px-6 flex-1 overflow-y-auto",
                "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                isAppLayout ? "pb-4" : "pb-8 pt-4",
              ].join(" ")}
            >
              {children}
            </div>

            {/* BOTTOM NAV */}
            {isAppLayout ? (
              <div className="relative z-10 p-4 pt-2 shrink-0 bg-gradient-to-t from-black/20 to-transparent">
                {bottom}
              </div>
            ) : null}
          </div>

          <p className="text-center text-xs text-slate-500 mt-6 shrink-0">
            Designed for mobile • Looks great on desktop too
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthCard;