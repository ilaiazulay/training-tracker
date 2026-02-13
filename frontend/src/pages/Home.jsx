// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import { getAuthData, clearAuthData } from "../auth";

import ProgressCard from "../components/home/ProgressCard";
import TodayCard from "../components/home/TodayCard";
import BottomNav from "../components/BottomNav";

import Modal from "../components/Modal";
import { useModal } from "../components/UseModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function workoutLabel(k) {
  if (!k) return "";
  if (k === "FULL") return "Workout Full Body";
  return `Workout ${k}`;
}

function minutesSince(isoOrDate) {
  if (!isoOrDate) return null;
  const created = new Date(isoOrDate).getTime();
  if (Number.isNaN(created)) return null;
  const diffMs = Date.now() - created;
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  return mins;
}

export default function Home() {
  const nav = useNavigate();

  const [authData] = useState(() => getAuthData());
  const token = authData?.tokens?.accessToken;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [activeWorkoutFull, setActiveWorkoutFull] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmNewWorkout = useModal();

  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMinuteTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!authData || !token) {
      nav("/");
    }
  }, [authData, token, nav]);

  function logout() {
    clearAuthData();
    nav("/");
  }

  async function loadHome() {
    if (!token) return;

    try {
      setError("");
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/workout/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load home");

      setToday(data);

      const defaultKey =
        data?.activeWorkout?.planDay ||
        data?.recommendedDayKey ||
        (data?.dayKeys?.[0] ?? "");

      setSelectedWorkout(defaultKey);
    } catch (e) {
      setError(e.message);
      setToday(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeWorkout = today?.activeWorkout || null;
  const activeWorkoutId = activeWorkout?.id || null;

  // Background fetch of the full active workout
  useEffect(() => {
    if (!token || !activeWorkoutId) {
      setActiveWorkoutFull(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/workouts/${activeWorkoutId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        if (!cancelled) setActiveWorkoutFull(data.workout);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, activeWorkoutId]);

  const hasActiveSession = !!activeWorkoutId;
  const hasActiveForSelected =
    hasActiveSession && activeWorkout?.planDay === selectedWorkout;

  const progress = useMemo(() => {
    if (!activeWorkoutFull?.exercises?.length) return null;
    const total = activeWorkoutFull.exercises.length;
    let done = 0;

    for (const we of activeWorkoutFull.exercises) {
      if ((we?.sets?.length || 0) > 0) done += 1;
    }

    return { done, total, pct: Math.round((done / total) * 100) };
  }, [activeWorkoutFull]);

  const currentExerciseName = useMemo(() => {
    const list = activeWorkoutFull?.exercises || [];
    if (!list.length) return "—";
    const next = list.find((we) => !(we?.sets?.length > 0));
    return (next || list[0])?.exercise?.name || "—";
  }, [activeWorkoutFull]);

  const totalMins = useMemo(() => {
    void minuteTick;
    return minutesSince(activeWorkout?.createdAt || activeWorkout?.date);
  }, [activeWorkout?.createdAt, activeWorkout?.date, minuteTick]);

  async function onContinue() {
    if (activeWorkoutId) {
      // Pass the fully loaded object so the next screen renders instantly
      nav(`/workout/${activeWorkoutId}`, {
        state: activeWorkoutFull ? { initialWorkout: activeWorkoutFull } : undefined,
      });
    }
  }

  async function discardActiveWorkout() {
    const res = await fetch(`${API_BASE_URL}/workout/abandon`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to discard workout");
  }

  async function onNewWorkout() {
    if (!today) return;

    if (hasActiveSession) {
      confirmNewWorkout.show({
        title: "Workout in progress",
        description: `You already have a workout in progress (${workoutLabel(
          activeWorkout.planDay
        )}). Starting a new workout will discard it.`,
      });
      return;
    }

    startWorkout();
  }

  async function startWorkout() {
    try {
      setError("");
      setBusy(true);

      const res = await fetch(`${API_BASE_URL}/workout/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dayKey: selectedWorkout }),
      });

      const data = await res.json().catch(() => ({}));

      // Resume case (409)
      if (res.status === 409 && data.workout?.id) {
        nav(`/workout/${data.workout.id}`, {
          state: { initialWorkout: data.workout },
        });
        return;
      }

      if (!res.ok) throw new Error(data.message || "Failed to start workout");

      await loadHome();
      
      // New workout case
      nav(`/workout/${data.workout.id}`, {
        state: { initialWorkout: data.workout },
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!authData) return null;

  return (
    <AuthCard
      title="Home"
      topRight={
        <button
          type="button"
          onClick={logout}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-200 hover:bg-white/10 transition backdrop-blur"
        >
          Logout
        </button>
      }
      bottom={
        <BottomNav
          active="home"
          onNavigate={(to) => {
            if (to !== "home") nav(`/${to}`);
          }}
        />
      }
    >
      <div className="flex flex-col min-h-[420px]">
        <ErrorAlert message={error} />

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" label="Loading home..." />
          </div>
        ) : !today ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-slate-300 text-sm">No data</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border border-white/15 bg-white/10 flex items-center justify-center text-white">
                👤
              </div>
              <div className="text-sm text-slate-300">
                Welcome back,{" "}
                <span className="text-white font-medium">
                  {authData?.user?.name || "Athlete"}
                </span>
              </div>
            </div>

            {hasActiveForSelected && (
              <ProgressCard
                workoutLabel={workoutLabel(activeWorkout.planDay)}
                progressPct={progress?.pct ?? 0}
                progressText={
                  progress
                    ? `${progress.done}/${progress.total} exercises done`
                    : "In progress"
                }
                totalTimeText={totalMins === null ? "—" : String(totalMins)}
                totalTimeUnit={"mins"}
                currentExerciseName={currentExerciseName}
                onContinue={onContinue}
              />
            )}

            <TodayCard
              recommended={workoutLabel(today.recommendedDayKey)}
              dayKeys={today.dayKeys || []}
              selected={selectedWorkout}
              onChangeSelected={setSelectedWorkout}
              hasActiveForSelected={hasActiveForSelected}
              busy={busy}
              onContinue={onContinue}
              onNewWorkout={onNewWorkout}
            />
          </div>
        )}
      </div>

      <Modal
        open={confirmNewWorkout.open}
        title={confirmNewWorkout.payload?.title}
        description={confirmNewWorkout.payload?.description}
        onClose={confirmNewWorkout.close}
        variant="center"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmNewWorkout.close}
            disabled={busy}
            className="flex-1 py-2.5 rounded-2xl border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10 transition disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              confirmNewWorkout.close();
              await discardActiveWorkout();
              startWorkout();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-400 transition disabled:opacity-60"
          >
            Discard & start
          </button>
        </div>
      </Modal>
    </AuthCard>
  );
}