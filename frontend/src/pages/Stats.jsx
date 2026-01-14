import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import BottomNav from "../components/BottomNav";
import { getAuthData, clearAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Stats() {
  const nav = useNavigate();

  // ✅ Initialize auth immediately
  const [authData] = useState(() => getAuthData());
  const token = authData?.tokens?.accessToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  function logout() {
    clearAuthData();
    nav("/");
  }

  useEffect(() => {
    if (!authData || !token) {
      nav("/");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError("");
        setLoading(true);

        const res = await fetch(`${API_BASE_URL}/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load stats");

        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authData, token, nav]);

  if (!authData) return null;

  return (
    <AuthCard 
      title="Stats"
      // ✅ Logout button goes here now
      topRight={
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-200 hover:bg-white/10 transition backdrop-blur"
        >
          Logout
        </button>
      }
      // ✅ Navbar goes here -> Fixed at bottom
      bottom={
        <BottomNav
          active="stats"
          onNavigate={(to) => {
            if (to !== "stats") nav(`/${to}`);
          }}
        />
      }
    >
      <div className="space-y-4">
        <ErrorAlert message={error} />

        {loading ? (
          <div className="text-center text-slate-300 text-sm mt-10">Loading stats…</div>
        ) : !stats ? (
          <div className="text-center text-slate-300 text-sm mt-10">No stats yet</div>
        ) : (
          <div className="space-y-4">
            {/* Overview */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-white font-semibold mb-2">Overview</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Workouts" value={stats.totalWorkouts ?? 0} />
                <Stat label="Exercises logged" value={stats.totalExercises ?? 0} />
                <Stat label="Total sets" value={stats.totalSets ?? 0} />
                <Stat label="Training days" value={stats.trainingDays ?? 0} />
              </div>
            </div>

            {/* PRs */}
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
              <div className="text-emerald-100 font-semibold mb-2">Personal Records</div>
              {!stats.prs?.length ? (
                <div className="text-slate-300 text-sm">No PRs yet</div>
              ) : (
                <div className="space-y-2 text-sm">
                  {stats.prs.map((p) => (
                    <div
                      key={p.exerciseId}
                      className="flex justify-between rounded-xl bg-black/20 px-3 py-2"
                    >
                      <span className="text-white">{p.exerciseName}</span>
                      <span className="text-emerald-200 font-semibold">
                        {p.weight}×{p.reps}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent workouts */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-white font-semibold mb-2">Recent workouts</div>
              {!stats.recentWorkouts?.length ? (
                <div className="text-slate-300 text-sm">No recent workouts</div>
              ) : (
                <div className="space-y-2 text-sm">
                  {stats.recentWorkouts.map((w) => (
                    <div key={w.id} className="flex justify-between text-slate-300">
                      <span>{w.label}</span>
                      <span>{w.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthCard>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-white font-semibold">{value}</div>
    </div>
  );
}