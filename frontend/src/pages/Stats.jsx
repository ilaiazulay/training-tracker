import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import BottomNav from "../components/BottomNav";
import { getAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Stats() {
  const nav = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [auth, setAuth] = useState(() => getAuthData()); // Initialize once

  useEffect(() => {
    // 1. Check Auth immediately
    if (!auth || !auth.tokens?.accessToken) {
      nav("/");
      return;
    }

    // 2. Fetch Stats
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/stats/overview`, {
          headers: { 
            Authorization: `Bearer ${auth.tokens.accessToken}` 
          },
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load stats");
        
        setStats(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [auth, nav]);

  // Prevent rendering if not authorized to stop the flicker
  if (!auth) return null;

  return (
    <AuthCard title="Stats" onBack={() => nav("/home")}>
      <ErrorAlert message={error} />

      {loading ? (
        <div className="text-center text-slate-300 text-sm">Loading stats…</div>
      ) : !stats ? (
        <div className="text-center text-slate-300 text-sm">No stats yet</div>
      ) : (
        <div className="space-y-4">
          {/* Overview */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-white font-semibold mb-2">Overview</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Workouts" value={stats.totalWorkouts} />
              <Stat label="Exercises logged" value={stats.totalExercises} />
              <Stat label="Total sets" value={stats.totalSets} />
              <Stat label="Training days" value={stats.trainingDays} />
            </div>
          </div>

          {/* PRs */}
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
            <div className="text-emerald-100 font-semibold mb-2">Personal Records</div>
            <div className="space-y-2 text-sm">
              {stats.prs?.map((p) => (
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
          </div>

          {/* Recent workouts */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-white font-semibold mb-2">Recent workouts</div>
            <div className="space-y-2 text-sm">
              {stats.recentWorkouts?.map((w) => (
                <div
                  key={w.id}
                  className="flex justify-between text-slate-300"
                >
                  <span>{w.label}</span>
                  <span>{w.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav active="stats" onNavigate={(to) => nav(`/${to}`)} />
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