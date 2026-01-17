import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  variant = "center", // "center" | "sheet"
}) {
  if (typeof document === "undefined") return null;

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.16 } }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.16 } }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
          />

          {/* Dialog */}
          <motion.div
            className={[
              "relative w-full max-w-md rounded-3xl border border-white/15 bg-slate-950/80 backdrop-blur-xl p-5",
              variant === "sheet" ? "mt-auto" : "",
            ].join(" ")}
            initial={{
              opacity: 0,
              y: variant === "sheet" ? 28 : 18,
              scale: variant === "sheet" ? 1 : 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.18, ease: "easeOut" },
            }}
            exit={{
              opacity: 0,
              y: variant === "sheet" ? 28 : 18,
              scale: variant === "sheet" ? 1 : 0.98,
              transition: { duration: 0.14, ease: "easeIn" },
            }}
          >
            {title ? (
              <div className="text-white font-semibold text-lg">{title}</div>
            ) : null}

            {description ? (
              <div className="text-slate-400 text-xs mt-1">{description}</div>
            ) : null}

            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}