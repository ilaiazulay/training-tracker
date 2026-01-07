import { useCallback, useState } from "react";

export function useModal() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);

  const show = useCallback((p) => {
    setPayload(p || null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // keep payload for a tick, so close animation could exist later
    setTimeout(() => setPayload(null), 0);
  }, []);

  return { open, payload, show, close };
}
