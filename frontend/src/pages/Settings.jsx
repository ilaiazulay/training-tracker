import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import BottomNav from "../components/BottomNav";
import { getAuthData, clearAuthData } from "../auth";

export default function Settings() {
  const nav = useNavigate();
  const authData = getAuthData();
  const user = authData?.user;

  if (!authData) return null;

  function logout() {
    clearAuthData();
    nav("/");
  }

  return (
    <AuthCard title="Settings" onBack={() => nav("/home")}>
      <div className="space-y-4">
        {/* Profile */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <div className="text-white font-semibold mb-2">Profile</div>
          <div className="text-sm text-slate-300">
            <div>Name: <span className="text-white">{user?.name}</span></div>
            <div>Email: <span className="text-white">{user?.email}</span></div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <div className="text-white font-semibold mb-2">Preferences</div>
          <div className="text-xs text-slate-400">
            More options coming soon (units, rest timers, themes)
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
          <div className="text-red-200 font-semibold mb-2">Danger zone</div>
          <button
            onClick={logout}
            className="w-full py-2.5 rounded-xl bg-red-400 text-slate-900 font-semibold hover:bg-red-300 transition"
          >
            Logout
          </button>
        </div>
      </div>

      <BottomNav active="settings" onNavigate={(to) => nav(`/${to}`)} />
    </AuthCard>
  );
}
