// src/pages/Workout.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import Modal from "../components/Modal";
import { getAuthData, clearAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function prettyMuscle(muscleGroup) {
  if (!muscleGroup) return "";
  return String(muscleGroup).replaceAll("_", " ").toLowerCase();
}

function sortBySetIndex(a, b) {
  return (a.setIndex ?? 0) - (b.setIndex ?? 0);
}

function formatStat(stat) {
  if (!stat) return null;
  if (stat.kind === "NORMAL") return `${stat.weight}×${stat.reps}`;
  if (stat.kind === "DROPSET") {
    const main = stat.main ? `${stat.main.weight}×${stat.main.reps}` : "";
    const drops = (stat.drops || []).map((d) => `${d.weight}×${d.reps}`).join(" → ");
    return drops ? `DS: ${main}${drops ? " → " + drops : ""}` : `DS: ${main}`;
  }
  return null;
}

function prefillFromLastBest(last) {
  if (!last) return { weight: 0, reps: 0 };
  if (last.kind === "NORMAL") return { weight: last.weight ?? 0, reps: last.reps ?? 0 };
  if (last.kind === "DROPSET") {
    if (last.bestPart) return { weight: last.bestPart.weight ?? 0, reps: last.bestPart.reps ?? 0 };
    if (last.main) return { weight: last.main.weight ?? 0, reps: last.main.reps ?? 0 };
  }
  return { weight: 0, reps: 0 };
}

// Helpers
function keyForSet(weId, setIndex, field) {
  return `${weId}:${setIndex}:${field}`;
}

function onlyNumberLike(value, { allowDecimal }) {
  const v = String(value ?? "");
  if (v === "") return "";
  const cleaned = v.replace(/[^\d.]/g, "");
  if (!allowDecimal) return cleaned.replace(/\./g, "");
  const parts = cleaned.split(".");
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
}

// Helper to ensure every set has a stable local key
function ensureLocalIds(w) {
  if (!w?.exercises) return w;
  const copy = structuredClone(w);
  copy.exercises.forEach((we) => {
    if (we.sets) {
      we.sets.forEach((s) => {
        if (!s._localId) s._localId = s.id; 
      });
    }
  });
  return copy;
}

export default function Workout() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const authData = getAuthData();
  const accessToken = authData?.tokens?.accessToken;

  // 1. Setup State
  // Use initial data passed from Home if available
  const initialData = location.state?.initialWorkout;
  const hasValidInitialData = initialData && Array.isArray(initialData.exercises);

  const [workout, setWorkout] = useState(
    hasValidInitialData ? ensureLocalIds(initialData) : null
  );
  
  // Separate state for stats (loaded lazily)
  const [stats, setStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!workout);
  const [completing, setCompleting] = useState(false);

  const [draft, setDraft] = useState({});

  // Modals
  const [dropOpenForWE, setDropOpenForWE] = useState(null);
  const [dropMain, setDropMain] = useState({ weight: "", reps: "" });
  const [dropParts, setDropParts] = useState([{ weight: "", reps: "" }]);
  const [savingDrop, setSavingDrop] = useState(false);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchForWE, setSwitchForWE] = useState(null);
  const [switchPool, setSwitchPool] = useState([]);
  const [switchSearch, setSwitchSearch] = useState("");
  const [switchPickId, setSwitchPickId] = useState(null);
  const [switchSaving, setSwitchSaving] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const lastAddedSetIdRef = useRef(null);

  function logout() {
    clearAuthData();
    nav("/");
  }

  // --- API CALLS ---

  // 1. Fast: Load Workout Structure
  async function fetchWorkout() {
    const res = await fetch(`${API_BASE_URL}/workouts/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Failed to load workout");
    return ensureLocalIds(data.workout);
  }

  // 2. Slow: Load Stats in Background
  async function fetchStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/workouts/${id}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to load stats", e);
    } finally {
      setStatsLoading(false);
    }
  }

  // Initial Load Effect
  useEffect(() => {
    if (!authData) {
      nav("/");
      return;
    }
    if (!accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        setError("");
        
        // If we don't have workout data yet, fetch it
        if (!workout) {
            setLoading(true);
            const w = await fetchWorkout();
            if (!cancelled) {
                setWorkout(w);
                setLoading(false);
            }
        } else {
            // Even if we have data passed from Home, refreshes ensure sync
            // (Optional: you can skip this if you trust Home data completely)
            fetchWorkout().then(w => !cancelled && setWorkout(w)).catch(() => {});
        }

        // Always fetch stats separately
        if (!cancelled) fetchStats();

      } catch (e) {
        if (!cancelled) setError(e.message);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken, nav]);

  // Fallback refresh (still used for complex operations like drop set creation)
  async function refreshWorkout() {
    try {
      const w = await fetchWorkout();
      setWorkout(w);
    } catch (e) {
      setError(e.message);
    }
  }

  function getStatsForExercise(exerciseId) {
    return stats[String(exerciseId)] || null;
  }

  const workoutLabel =
    workout?.planDay === "FULL" ? "Workout (Full Body)" : `Workout ${workout?.planDay || ""}`;

  const exercises = useMemo(() => {
    if (!workout) return [];
    return (workout.exercises || []).map((we) => {
      const sets = [...(we.sets || [])].sort(sortBySetIndex);
      const normalSets = sets.filter((s) => s.kind === "NORMAL" || !s.dropGroupId);

      const dropMap = new Map();
      for (const s of sets) {
        if (!s.dropGroupId) continue;
        if (!dropMap.has(s.dropGroupId)) dropMap.set(s.dropGroupId, []);
        dropMap.get(s.dropGroupId).push(s);
      }

      const dropGroups = Array.from(dropMap.entries()).map(([groupId, groupSets]) => {
        const sorted = [...groupSets].sort(sortBySetIndex);
        const main = sorted.find((x) => x.kind === "DROP_MAIN") || sorted[0] || null;
        const parts = sorted.filter((x) => x.kind === "DROP_PART");
        return { groupId, main, parts };
      });

      return { ...we, normalSets, dropGroups };
    });
  }, [workout]);

  // --- ACTIONS ---

  async function addNormalSet(workoutExerciseId, exerciseId) {
    try {
      setError("");
      const statsData = getStatsForExercise(exerciseId); // Use loaded stats
      const last = statsData?.last;
      const prefill = prefillFromLastBest(last);

      const we = exercises.find((x) => x.id === workoutExerciseId);
      const lastNormal = we?.normalSets?.length ? we.normalSets[we.normalSets.length - 1] : null;
      const nextIndex = lastNormal ? lastNormal.setIndex + 1 : 0;

      // Optimistic Update
      const tempId = `temp-${Date.now()}`; 
      const newSet = {
        id: tempId,
        _localId: tempId, 
        workoutExerciseId,
        setIndex: nextIndex,
        weight: prefill.weight,
        reps: prefill.reps,
        kind: "NORMAL",
      };

      setWorkout((prev) => {
        const next = structuredClone(prev);
        const targetWe = next.exercises.find((e) => e.id === workoutExerciseId);
        if (targetWe) {
            targetWe.sets = [...(targetWe.sets || []), newSet];
        }
        return next;
      });
      
      lastAddedSetIdRef.current = tempId;

      const res = await fetch(`${API_BASE_URL}/workouts/${id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          workoutExerciseId,
          setIndex: nextIndex,
          weight: prefill.weight,
          reps: prefill.reps,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add set");

      // Swap temp ID with real ID
      if (data?.set?.id) {
        setWorkout((prev) => {
            const next = structuredClone(prev);
            const targetWe = next.exercises.find((e) => e.id === workoutExerciseId);
            if (targetWe) {
                targetWe.sets = targetWe.sets.map(s => 
                    s.id === tempId ? { ...data.set, _localId: tempId } : s
                );
            }
            return next;
        });
      } else {
        await refreshWorkout();
      }

    } catch (e) {
      setError(e.message);
      await refreshWorkout();
    }
  }

  async function updateNormalSet(workoutExerciseId, setIndex, weight, reps) {
    const prevWorkout = workout;
    try {
      setError("");
      setWorkout((prev) => {
        const next = structuredClone(prev);
        const targetWe = next.exercises.find((e) => e.id === workoutExerciseId);
        if (targetWe?.sets) {
            const s = targetWe.sets.find(s => s.setIndex === setIndex && (!s.dropGroupId || s.kind === "NORMAL"));
            if (s) {
                s.weight = Number(weight);
                s.reps = Number(reps);
            }
        }
        return next;
      });

      const res = await fetch(`${API_BASE_URL}/workouts/${id}/sets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          workoutExerciseId,
          setIndex,
          weight: Number(weight),
          reps: Number(reps),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save set");
      }
    } catch (e) {
      setError(e.message);
      setWorkout(prevWorkout);
    }
  }

  async function removeSet(setId) {
    const prevWorkout = workout;
    try {
      setError("");
      setWorkout((prev) => {
        const next = structuredClone(prev);
        for(const we of next.exercises) {
            if (we.sets) {
                we.sets = we.sets.filter(s => s.id !== setId);
            }
        }
        return next;
      });

      const res = await fetch(`${API_BASE_URL}/workouts/${id}/sets/${setId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error("Failed to delete set");
    } catch (e) {
      setError(e.message);
      setWorkout(prevWorkout);
    }
  }

  // Drafts
  function getDraftValue(weId, setIndex, field, fallback) {
    const k = keyForSet(weId, setIndex, field);
    return draft[k] ?? String(fallback ?? "");
  }

  function setDraftValue(weId, setIndex, field, val) {
    const k = keyForSet(weId, setIndex, field);
    setDraft((d) => ({ ...d, [k]: val }));
  }

  async function commitDraft(weId, setIndex, currentSet) {
    const wKey = keyForSet(weId, setIndex, "weight");
    const rKey = keyForSet(weId, setIndex, "reps");
    const wStr = draft[wKey] ?? String(currentSet.weight ?? "");
    const rStr = draft[rKey] ?? String(currentSet.reps ?? "");

    const w = wStr === "" ? 0 : Number(wStr);
    const r = rStr === "" ? 0 : Number(rStr);

    if (!Number.isFinite(w) || !Number.isFinite(r)) return;
    if (w === currentSet.weight && r === currentSet.reps) return;

    await updateNormalSet(weId, setIndex, w, r);

    setDraft((d) => {
      const next = { ...d };
      delete next[wKey];
      delete next[rKey];
      return next;
    });
  }

  async function updateAnySetById(setId, weight, reps) {
    try {
      setError("");
      const res = await fetch(`${API_BASE_URL}/workouts/${id}/sets/${setId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          weight: Number(weight),
          reps: Number(reps),
        }),
      });
      if (!res.ok) throw new Error("Failed to update set");
      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    }
  }

  function openDropSetModal(workoutExerciseId, exerciseId) {
    const statsData = getStatsForExercise(exerciseId);
    const last = statsData?.last;
    const prefill = prefillFromLastBest(last);
    setDropOpenForWE(workoutExerciseId);
    setDropMain({
      weight: prefill.weight ? String(prefill.weight) : "",
      reps: prefill.reps ? String(prefill.reps) : "",
    });
    setDropParts([{ weight: "", reps: "" }]);
  }

  async function saveDropSet() {
    if (!dropOpenForWE) return;
    try {
      setError("");
      setSavingDrop(true);
      const mainW = Number(dropMain.weight);
      const mainR = Number(dropMain.reps);
      const cleanDrops = dropParts
        .filter((p) => String(p.weight).trim() !== "" || String(p.reps).trim() !== "")
        .map((p) => ({ weight: Number(p.weight), reps: Number(p.reps) }));

      const res = await fetch(`${API_BASE_URL}/workouts/${id}/dropsets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          workoutExerciseId: dropOpenForWE,
          main: { weight: mainW, reps: mainR },
          drops: cleanDrops,
        }),
      });
      if (!res.ok) throw new Error("Failed to create drop set");
      setDropOpenForWE(null);
      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingDrop(false);
    }
  }

  async function deleteDropGroup(groupId) {
    try {
      setError("");
      const res = await fetch(`${API_BASE_URL}/workouts/${id}/dropsets/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete drop set");
      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    }
  }

  async function completeWorkout() {
    try {
      setError("");
      setCompleting(true);
      const res = await fetch(`${API_BASE_URL}/workouts/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to complete workout");
      nav("/home");
    } catch (e) {
      setError(e.message);
    } finally {
      setCompleting(false);
    }
  }

  useEffect(() => {
    if (!switchOpen || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        setSwitchError("");
        const res = await fetch(`${API_BASE_URL}/exercises`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Failed to load exercises");
        if (!cancelled) setSwitchPool(data.exercises || []);
      } catch (e) {
        if (!cancelled) setSwitchError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [switchOpen, accessToken]);

  function openSwitchModal(we) {
    setSwitchError("");
    setSwitchSearch("");
    setSwitchPickId(null);
    setSwitchForWE(we);
    setSwitchOpen(true);
  }
  function closeSwitchModal() {
    setSwitchOpen(false);
    setSwitchForWE(null);
    setSwitchPickId(null);
    setSwitchSearch("");
    setSwitchError("");
  }

  const switchCandidates = useMemo(() => {
    if (!switchForWE) return [];
    const currentId = switchForWE.exerciseId;
    const mg = switchForWE?.plannedExercise?.muscleGroup || switchForWE?.exercise?.muscleGroup;
    const q = switchSearch.trim().toLowerCase();
    return switchPool
      .filter((e) => (mg ? e.muscleGroup === mg : true))
      .filter((e) => e.id !== currentId)
      .filter((e) => (!q ? true : String(e.name).toLowerCase().includes(q)))
      .slice(0, 30);
  }, [switchForWE, switchPool, switchSearch]);

  async function submitSwitch() {
    if (!switchForWE || !switchPickId) return;
    try {
      setSwitchError("");
      setSwitchSaving(true);
      const res = await fetch(`${API_BASE_URL}/workouts/exercises/${switchForWE.id}/switch`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ newExerciseId: switchPickId }),
      });
      if (!res.ok) throw new Error("Failed to switch exercise");
      closeSwitchModal();
      await refreshWorkout();
    } catch (e) {
      setSwitchError(e.message);
    } finally {
      setSwitchSaving(false);
    }
  }

  if (!authData) return null;

  return (
    <>
      <button
        type="button"
        onClick={logout}
        className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white text-xs hover:bg-white/10 transition"
      >
        Logout
      </button>

      <AuthCard title={workoutLabel} onBack={() => nav("/home")}>
        <div className="flex flex-col min-h-[420px]">
          <ErrorAlert message={error} />

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner size="lg" label="Loading workout..." />
            </div>
          ) : !workout ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-slate-300 text-sm">Workout not found</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="text-xs text-slate-400">
                  Status:{" "}
                  <span className="text-white font-medium">
                    {workout.status === "PLANNED" ? "IN PROGRESS" : workout.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Exercises:{" "}
                  <span className="text-white font-medium">{workout.exercises?.length || 0}</span>
                </div>
              </div>

              {exercises.map((we) => {
                const statsData = getStatsForExercise(we.exerciseId);
                const lastText = formatStat(statsData?.last);
                const prText = formatStat(statsData?.pr);
                const plannedName = we?.plannedExercise?.name || we?.exercise?.name || "";
                const performedName = we?.exercise?.name || "";
                const isSwitched = !!we.isSubstitution && !!we.plannedExerciseId && we.exerciseId !== we.plannedExerciseId;

                return (
                  <div key={we.id} className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/20 flex-shrink-0 border border-white/10">
                        {we.exercise?.imageUrl ? (
                          <img src={we.exercise.imageUrl} alt={we.exercise.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400">No image</div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-white font-semibold">{performedName}</div>
                          {isSwitched && <span className="px-2 py-0.5 rounded-full text-[10px] border border-amber-300/30 bg-amber-400/10 text-amber-200">switched</span>}
                        </div>
                        <div className="text-[11px] text-slate-400">{prettyMuscle(we.exercise?.muscleGroup)}</div>
                        {isSwitched && <div className="text-[11px] text-slate-400 mt-1">Planned: <span className="text-slate-200">{plannedName}</span></div>}
                        
                        {/* Stats Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {statsLoading ? (
                             <div className="text-[10px] text-slate-500 animate-pulse">Loading history...</div>
                          ) : (
                             <>
                               {lastText ? <span className="px-2 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-slate-200">Last best: <span className="font-semibold text-white">{lastText}</span></span> : <span className="px-2 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-slate-400">No last data</span>}
                               {prText && <span className="px-2 py-1 rounded-full text-[11px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">PR: <span className="font-semibold text-emerald-100">{prText}</span></span>}
                             </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => addNormalSet(we.id, we.exerciseId)} className="px-3 py-1.5 rounded-xl text-sm border border-white/15 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98] transition">+ Set</button>
                        <button type="button" onClick={() => openDropSetModal(we.id, we.exerciseId)} className="px-3 py-1.5 rounded-xl text-sm border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 active:scale-[0.98] transition">+ Drop</button>
                        <button type="button" onClick={() => openSwitchModal(we)} className="px-3 py-1.5 rounded-xl text-sm border border-amber-300/20 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15 active:scale-[0.98] transition">Switch</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence initial={false} mode="popLayout">
                        {we.normalSets.map((s) => {
                          const isJustAdded = lastAddedSetIdRef.current && s.id === lastAddedSetIdRef.current;
                          // Stable key ensures optimistic update doesn't flicker
                          return (
                            <motion.div
                              key={s._localId || s.id}
                              layout
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                boxShadow: isJustAdded ? "0 0 0 1px rgba(52,211,153,0.35), 0 0 22px rgba(52,211,153,0.18)" : "0 0 0 0 rgba(0,0,0,0)",
                              }}
                              exit={{ opacity: 0, y: -8, scale: 0.96 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              onAnimationComplete={() => { if (isJustAdded) lastAddedSetIdRef.current = null; }}
                              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                            >
                              <div className="text-xs text-slate-300 w-10">#{s.setIndex + 1}</div>
                              <input
                                className="w-20 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                                type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                                value={getDraftValue(we.id, s.setIndex, "weight", s.weight)}
                                onChange={(e) => { const v = onlyNumberLike(e.target.value, { allowDecimal: true }).replace(",", "."); setDraftValue(we.id, s.setIndex, "weight", v); }}
                                onBlur={() => commitDraft(we.id, s.setIndex, s)}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                              />
                              <div className="text-xs text-slate-400">kg</div>
                              <input
                                className="w-16 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                                type="text" inputMode="numeric" pattern="[0-9]*"
                                value={getDraftValue(we.id, s.setIndex, "reps", s.reps)}
                                onChange={(e) => { const v = onlyNumberLike(e.target.value, { allowDecimal: false }); setDraftValue(we.id, s.setIndex, "reps", v); }}
                                onBlur={() => commitDraft(we.id, s.setIndex, s)}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                              />
                              <div className="text-xs text-slate-400">reps</div>
                              <button type="button" onClick={() => removeSet(s.id)} className="ml-auto text-xs text-red-300 hover:text-red-200 transition" title="Remove set">Remove</button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {we.normalSets.length === 0 && <div className="text-xs text-slate-400">No sets logged yet</div>}
                    </div>

                    {/* DROP SET GROUPS */}
                    {we.dropGroups.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {we.dropGroups.map((g) => (
                           <div key={g.groupId} className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-emerald-100">Drop set</div>
                                <button type="button" onClick={() => deleteDropGroup(g.groupId)} className="text-xs text-red-200 hover:text-red-100 transition">Delete</button>
                              </div>
                              <div className="space-y-2">
                                {g.main && (
                                   <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                      <div className="text-[11px] text-emerald-200 w-12">Main</div>
                                      <input className="w-20 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40" type="number" step="0.5" value={g.main.weight} onChange={(e) => updateAnySetById(g.main.id, e.target.value, g.main.reps)} />
                                      <div className="text-xs text-slate-200">kg</div>
                                      <input className="w-16 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40" type="number" value={g.main.reps} onChange={(e) => updateAnySetById(g.main.id, g.main.weight, e.target.value)} />
                                      <div className="text-xs text-slate-200">reps</div>
                                   </div>
                                )}
                                {g.parts.map((p, idx) => (
                                   <div key={p.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                      <div className="text-[11px] text-emerald-200 w-12">Drop {idx + 1}</div>
                                      <input className="w-20 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40" type="number" step="0.5" value={p.weight} onChange={(e) => updateAnySetById(p.id, e.target.value, p.reps)} />
                                      <div className="text-xs text-slate-200">kg</div>
                                      <input className="w-16 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40" type="number" value={p.reps} onChange={(e) => updateAnySetById(p.id, p.weight, e.target.value)} />
                                      <div className="text-xs text-slate-200">reps</div>
                                   </div>
                                ))}
                              </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={completeWorkout} disabled={completing} className="w-full bg-emerald-400 text-slate-900 font-medium py-2.5 rounded-xl text-sm hover:bg-emerald-300 active:scale-[0.99] transition disabled:opacity-60">{completing ? "Completing..." : "Finish workout"}</button>
            </div>
          )}
        </div>

        {/* Drop Set Modal */}
        <Modal open={!!dropOpenForWE} title="Add drop set" description="Main set + optional drops" onClose={() => setDropOpenForWE(null)} variant="center">
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-300 mb-2">Main</div>
              <div className="flex items-center gap-2">
                <input className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40" type="number" step="0.5" placeholder="kg" value={dropMain.weight} onChange={(e) => setDropMain((x) => ({ ...x, weight: e.target.value }))} />
                <input className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40" type="number" placeholder="reps" value={dropMain.reps} onChange={(e) => setDropMain((x) => ({ ...x, reps: e.target.value }))} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-300">Drops</div>
                <button type="button" onClick={() => setDropParts((arr) => [...arr, { weight: "", reps: "" }])} className="text-xs px-2 py-1 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition">+ Add drop</button>
              </div>
              <div className="space-y-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {dropParts.map((p, idx) => (
                    <motion.div key={idx} layout initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} transition={{ duration: 0.16, ease: "easeOut" }} className="flex items-center gap-2">
                      <input className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40" type="number" step="0.5" placeholder="kg" value={p.weight} onChange={(e) => setDropParts((arr) => arr.map((x, i) => (i === idx ? { ...x, weight: e.target.value } : x)))} />
                      <input className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40" type="number" placeholder="reps" value={p.reps} onChange={(e) => setDropParts((arr) => arr.map((x, i) => (i === idx ? { ...x, reps: e.target.value } : x)))} />
                      <button type="button" className="ml-auto text-xs text-red-300 hover:text-red-200 transition" onClick={() => setDropParts((arr) => arr.filter((_, i) => i !== idx))} title="Remove drop">Remove</button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDropOpenForWE(null)} className="flex-1 py-2.5 rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition text-sm">Cancel</button>
              <button type="button" disabled={savingDrop} onClick={saveDropSet} className="flex-1 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-semibold hover:bg-emerald-300 transition text-sm disabled:opacity-60">{savingDrop ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </Modal>

        {/* Switch Exercise Modal */}
        <Modal open={switchOpen} title="Switch exercise" description={switchForWE ? `Choose a replacement for "${switchForWE.exercise?.name}".` : ""} onClose={closeSwitchModal} variant="center">
          <div className="space-y-3">
             {switchError && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{switchError}</div>}
             <input className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-white/40" placeholder="Search..." value={switchSearch} onChange={(e) => setSwitchSearch(e.target.value)} />
             <div className="max-h-60 overflow-auto space-y-2 pr-1">
                {switchCandidates.length === 0 ? <div className="text-[12px] text-slate-400 px-2 py-3">No matching exercises found.</div> : switchCandidates.map((ex) => (
                   <button key={ex.id} type="button" onClick={() => setSwitchPickId(ex.id)} className={["w-full text-left px-3 py-2 rounded-xl border transition", switchPickId === ex.id ? "bg-amber-400/20 border-amber-300/40 text-white" : "bg-white/5 border-white/15 text-slate-100 hover:bg-white/10"].join(" ")}>
                      <div className="text-sm">{ex.name}</div>
                      <div className="text-[11px] text-slate-300">{prettyMuscle(ex.muscleGroup)} {ex.isGlobal ? "• global" : "• yours"}</div>
                   </button>
                ))}
             </div>
             <div className="flex gap-2">
                <button type="button" onClick={closeSwitchModal} className="flex-1 py-2.5 rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition text-sm">Cancel</button>
                <button type="button" disabled={!switchPickId || switchSaving} onClick={submitSwitch} className="flex-1 py-2.5 rounded-2xl bg-amber-300 text-slate-900 font-semibold hover:bg-amber-200 transition text-sm disabled:opacity-60">{switchSaving ? "Switching..." : "Switch"}</button>
             </div>
          </div>
        </Modal>
      </AuthCard>
    </>
  );
}