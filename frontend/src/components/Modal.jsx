import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", onKeyDown);

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const node = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close modal"
      />

      {/* Centered Panel */}
      <div className="relative w-[92vw] max-w-md">
        <div className="relative rounded-3xl border border-white/15 bg-slate-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* subtle glass glow */}
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-tr from-white/10 via-transparent to-white/20 opacity-40 pointer-events-none" />

          <div className="relative p-5">
            {title ? (
              <div className="text-white font-semibold text-base">{title}</div>
            ) : null}

            {description ? (
              <div className="text-sm text-slate-300 mt-2 leading-relaxed">
                {description}
              </div>
            ) : null}

            <div className="mt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ Portal makes it truly screen-centered regardless of parent transforms
  return createPortal(node, document.body);
}
