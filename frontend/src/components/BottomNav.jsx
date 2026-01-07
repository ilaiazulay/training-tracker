function IconHome({ active }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-5 w-5", active ? "text-white" : "text-slate-400"].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" />
    </svg>
  );
}

function IconChart({ active }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-5 w-5", active ? "text-white" : "text-slate-400"].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 19V5" />
      <path d="M8 19V11" />
      <path d="M12 19V7" />
      <path d="M16 19V14" />
      <path d="M20 19V9" />
    </svg>
  );
}

function IconSettings({ active }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={["h-5 w-5", active ? "text-white" : "text-slate-400"].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a7.9 7.9 0 0 0 .1-6l-2.2-.4a6.2 6.2 0 0 0-1.1-1.1l.4-2.2a7.9 7.9 0 0 0-6-.1l-.4 2.2c-.4.3-.8.6-1.1 1.1L6 9a7.9 7.9 0 0 0-.1 6l2.2.4c.3.4.6.8 1.1 1.1l-.4 2.2a7.9 7.9 0 0 0 6 .1l.4-2.2c.4-.3.8-.6 1.1-1.1l2.1-.4Z" />
    </svg>
  );
}

function NavButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 py-2 rounded-2xl transition flex flex-col items-center justify-center gap-1",
        active ? "bg-white/10" : "hover:bg-white/5",
      ].join(" ")}
    >
      {icon}
      <div className={["text-[11px]", active ? "text-white" : "text-slate-400"].join(" ")}>
        {label}
      </div>
    </button>
  );
}

export default function BottomNav({ active = "home", onNavigate }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-2 flex gap-2">
      <NavButton
        active={active === "home"}
        label="Home"
        icon={<IconHome active={active === "home"} />}
        onClick={() => onNavigate?.("home")}
      />
      <NavButton
        active={active === "stats"}
        label="Stats"
        icon={<IconChart active={active === "stats"} />}
        onClick={() => onNavigate?.("stats")}
      />
      <NavButton
        active={active === "settings"}
        label="Settings"
        icon={<IconSettings active={active === "settings"} />}
        onClick={() => onNavigate?.("settings")}
      />
    </div>
  );
}
