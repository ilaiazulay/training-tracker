// src/components/AuthCard.jsx
import React from "react";

function looksLikeBottomNav(el) {
  if (!React.isValidElement(el)) return false;

  const type = el.type;
  const name =
    typeof type === "function"
      ? type.displayName || type.name
      : typeof type === "string"
        ? type
        : "";

  // dev-friendly
  if (name === "BottomNav") return true;

  // robust fallback
  const p = el.props || {};
  if (typeof p.onNavigate === "function") return true;

  return false;
}

function findBottomNavDeep(node) {
  // Recursively search for BottomNav inside nested JSX
  if (!node) return null;

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findBottomNavDeep(child);
      if (found) return found;
    }
    return null;
  }

  if (!React.isValidElement(node)) return null;

  if (looksLikeBottomNav(node)) return node;

  const kids = node.props?.children;
  if (!kids) return null;

  return findBottomNavDeep(React.Children.toArray(kids));
}

function removeBottomNavDeep(node) {
  // Recursively remove the first BottomNav found (to avoid double render)
  if (!node) return node;

  if (Array.isArray(node)) {
    let removed = false;
    const next = node
      .map((child) => {
        if (removed) return child;

        const found = findBottomNavDeep(child);
        if (found && looksLikeBottomNav(found) && React.isValidElement(child) && looksLikeBottomNav(child)) {
          removed = true;
          return null;
        }

        const updated = removeBottomNavDeep(child);
        if (updated !== child) removed = true;
        return updated;
      })
      .filter(Boolean);

    return next;
  }

  if (!React.isValidElement(node)) return node;

  if (looksLikeBottomNav(node)) return null;

  const kids = node.props?.children;
  if (!kids) return node;

  const arr = React.Children.toArray(kids);
  const cleanedArr = removeBottomNavDeep(arr);

  // If nothing changed, return original node
  if (cleanedArr === arr) return node;

  return React.cloneElement(node, node.props, cleanedArr);
}

function AuthCard({ title, children, onBack, topRight, bottom }) {
  // ✅ If 'bottom' exists -> use it (your old working behavior)
  // ✅ Else -> auto-detect BottomNav inside children (even nested)
  const bottomFromChildren = bottom ? null : findBottomNavDeep(children);
  const navEl = bottom || bottomFromChildren;

  // Remove BottomNav from children if we extracted it (prevents duplicates)
  const content =
    bottom || !bottomFromChildren ? children : removeBottomNavDeep(children);

  const isAppLayout = !!navEl;

  return (
    <div className="h-screen overflow-hidden relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 font-sans">
      {/* Top Right Slot (Logout) */}
      {topRight ? <div className="absolute top-4 right-4 z-20">{topRight}</div> : null}

      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-md h-full max-h-[92vh] flex flex-col">
          {/* Main App Title (Outside Card) */}
          <div className="mb-4 text-center shrink-0">
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Training Tracker
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Stay consistent. Track your progress.
            </p>
          </div>

          {/* --- CARD CONTAINER --- */}
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/15 shadow-2xl rounded-3xl overflow-hidden flex flex-col flex-1">
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
                  aria-label="Go back"
                  title="Back"
                >
                  ←
                </button>
              ) : null}

              <h2 className="flex-1 text-xl font-medium text-white text-center">
                {title}
              </h2>

              {onBack ? <div className="w-9" /> : null}
            </div>

            {/* CONTENT (ONLY this scrolls) */}
            <div
              className={[
                "relative z-10 w-full px-6 flex-1 overflow-y-auto",
                "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                isAppLayout ? "pb-4" : "pb-8 pt-4",
              ].join(" ")}
            >
              {content}
            </div>

            {/* BOTTOM NAV (fixed) */}
            {isAppLayout ? (
              <div className="relative z-10 p-4 pt-2 shrink-0 bg-gradient-to-t from-black/20 to-transparent">
                {navEl}
              </div>
            ) : null}
          </div>

          <p className="text-center text-xs text-slate-500 mt-3 shrink-0">
            Designed for mobile • Looks great on desktop too
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthCard;
