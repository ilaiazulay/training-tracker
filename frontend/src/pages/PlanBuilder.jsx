import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import { getAuthData, saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// MUST match your Prisma enum MuscleGroup values
const MUSCLE_GROUPS = [
  "CHEST",
  "SHOULDERS",
  "TRICEPS",
  "BACK",
  "BICEPS",
  "LEGS",
  "TRAPS",
  "FOREARMS",
  "CORE",
];

function getDayKeys(planType) {
  if (planType === "AB") return ["A", "B"];
  if (planType === "ABC") return ["A", "B", "C"];
  if (planType === "ABCD") return ["A", "B", "C", "D"];
  return ["A"]; // FULL_BODY etc.
}

export default function PlanBuilder() {
  const nav = useNavigate();
  const authData = getAuthData();

  const dayKeys = useMemo(() => {
    if (!authData) return ["A"];
    return getDayKeys(authData.user.planType);
  }, [authData]);

  const [activeDay, setActiveDay] = useState(dayKeys[0]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [exercisePool, setExercisePool] = useState([]);
  const [search, setSearch] = useState("");

  // Per-day builder state
  const [daysState, setDaysState] = useState(() => {
    const obj = {};
    for (const k of dayKeys) obj[k] = { muscleGroups: [], exerciseIds: [] };
    return obj;
  });

  // Add custom exercise form
  const [newExName, setNewExName] = useState("");
  const [newExGroup, setNewExGroup] = useState(MUSCLE_GROUPS[0] || "CHEST");

  // Load exercise pool
  useEffect(() => {
    if (!authData) {
      nav("/");
      return;
    }

    (async () => {
      try {
        setError("");
        const res = await fetch(`${API_BASE_URL}/exercises`, {
          headers: { Authorization: `Bearer ${authData.tokens.accessToken}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load exercises");
        }
        const data = await res.json();
        setExercisePool(data.exercises || []);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [authData, nav]);

  // Keep activeDay + daysState aligned with planType changes
  useEffect(() => {
    if (!dayKeys.includes(activeDay)) setActiveDay(dayKeys[0]);

    setDaysState((prev) => {
      const next = { ...prev };
      for (const k of dayKeys) {
        if (!next[k]) next[k] = { muscleGroups: [], exerciseIds: [] };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKeys.join("|")]);

  if (!authData) return null;

  const selectedIds = daysState[activeDay]?.exerciseIds || [];
  const selectedGroupsForDay = daysState[activeDay]?.muscleGroups || [];

  // Keep newExGroup valid for the active day's selected muscle groups
  useEffect(() => {
    if (selectedGroupsForDay.length > 0 && !selectedGroupsForDay.includes(newExGroup)) {
      setNewExGroup(selectedGroupsForDay[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay, selectedGroupsForDay.join("|")]);

  const toggleMuscle = (dayKey, mg) => {
    setDaysState((prev) => {
      const cur = prev[dayKey];
      const exists = cur.muscleGroups.includes(mg);
      const muscleGroups = exists
        ? cur.muscleGroups.filter((x) => x !== mg)
        : [...cur.muscleGroups, mg];
      return { ...prev, [dayKey]: { ...cur, muscleGroups } };
    });
  };

  const toggleExercise = (dayKey, exId) => {
    setDaysState((prev) => {
      const cur = prev[dayKey];
      const exists = cur.exerciseIds.includes(exId);
      const exerciseIds = exists
        ? cur.exerciseIds.filter((x) => x !== exId)
        : [...cur.exerciseIds, exId];
      return { ...prev, [dayKey]: { ...cur, exerciseIds } };
    });
  };

  // Filter pool by selected muscle groups for the active day
  const poolForActiveDay = useMemo(() => {
    if (selectedGroupsForDay.length === 0) return [];
    const allowed = new Set(selectedGroupsForDay);
    return exercisePool.filter((ex) => allowed.has(ex.muscleGroup));
  }, [exercisePool, selectedGroupsForDay]);

  // Then apply search filter
  const filteredPool = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return poolForActiveDay;
    return poolForActiveDay.filter((e) => e.name.toLowerCase().includes(q));
  }, [poolForActiveDay, search]);

  const suggestions = useMemo(() => {
    return filteredPool.slice(0, 12).map((e) => e.name);
  }, [filteredPool]);

  const createCustomExercise = async () => {
    try {
      setError("");

      if (selectedGroupsForDay.length === 0) {
        throw new Error(`Select muscle groups for Day ${activeDay} first.`);
      }

      const name = newExName.trim();
      if (name.length < 2 || name.length > 60) {
        throw new Error("Exercise name must be 2–60 characters.");
      }

      if (!selectedGroupsForDay.includes(newExGroup)) {
        throw new Error("Muscle group must be one of the selected groups for this day.");
      }

      const res = await fetch(`${API_BASE_URL}/exercises`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.tokens.accessToken}`,
        },
        body: JSON.stringify({ name, muscleGroup: newExGroup }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create exercise");

      // Add to pool and auto-select
      setExercisePool((prev) => [data.exercise, ...prev]);
      setNewExName("");
      toggleExercise(activeDay, data.exercise.id);
    } catch (e) {
      setError(e.message);
    }
  };

  const savePlan = async () => {
    try {
      setError("");
      setSaving(true);

      // Require: at least 1 muscle group + 1 exercise per day
      for (const k of dayKeys) {
        if (!daysState[k] || daysState[k].muscleGroups.length === 0) {
          throw new Error(`Day ${k} must have at least 1 muscle group selected`);
        }
        if (!daysState[k] || daysState[k].exerciseIds.length === 0) {
          throw new Error(`Day ${k} must have at least 1 exercise`);
        }
      }

      const payload = {
        days: dayKeys.map((k) => ({
          dayKey: k,
          muscleGroups: daysState[k].muscleGroups,
          exerciseIds: daysState[k].exerciseIds,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/plan/custom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.tokens.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save plan");

      saveAuthData({
        ...authData,
        user: { ...authData.user, hasConfiguredPlan: true },
      });

      nav("/home");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Disable save until each day has ≥1 muscle group and ≥1 exercise
  const canSave = useMemo(() => {
    return dayKeys.every((k) => {
      const d = daysState[k];
      return d && d.muscleGroups.length > 0 && d.exerciseIds.length > 0;
    });
  }, [dayKeys, daysState]);

  return (
    <AuthCard title="Build your plan" onBack={() => nav(-1)}>
      <div className="space-y-4">
        <ErrorAlert message={error} />

        {/* Day tabs */}
        <div className="flex justify-center gap-2">
          {dayKeys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveDay(k)}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                activeDay === k
                  ? "bg-white text-slate-900 border-white"
                  : "bg-white/5 text-slate-100 border-white/15 hover:bg-white/10"
              }`}
            >
              Day {k}
            </button>
          ))}
        </div>

        {/* Muscle groups */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300">Muscle groups for Day {activeDay}</div>
            <div className="text-[11px] text-slate-400">Required</div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {MUSCLE_GROUPS.map((mg) => {
              const active = selectedGroupsForDay.includes(mg);
              return (
                <button
                  key={mg}
                  type="button"
                  onClick={() => toggleMuscle(activeDay, mg)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] border transition ${
                    active
                      ? "bg-emerald-400 text-slate-900 border-emerald-300"
                      : "bg-white/5 text-slate-100 border-white/15 hover:bg-white/10"
                  }`}
                >
                  {mg.replaceAll("_", " ").toLowerCase()}
                </button>
              );
            })}
          </div>

          {selectedGroupsForDay.length === 0 ? (
            <div className="text-[11px] text-amber-300 mt-3">
              Select at least 1 muscle group for Day {activeDay}.
            </div>
          ) : null}
        </div>

        {/* Selected exercises */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300">Selected for Day {activeDay}</div>
            <div className="text-[11px] text-slate-400">{selectedIds.length} selected</div>
          </div>

          {selectedIds.length === 0 ? (
            <div className="text-[11px] text-slate-400 mt-2">No exercises selected yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedIds.map((id) => {
                const ex = exercisePool.find((x) => x.id === id);
                if (!ex) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleExercise(activeDay, id)}
                    className="px-3 py-1.5 rounded-full text-[11px] border border-emerald-400/40 bg-emerald-400/15 text-white hover:bg-emerald-400/25 transition"
                    title="Click to remove"
                  >
                    {ex.name} <span className="opacity-70">✕</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Add custom exercise */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3 space-y-2">
          <div className="text-xs text-slate-300">Add your own exercise</div>

          {selectedGroupsForDay.length === 0 ? (
            <div className="text-[11px] text-amber-300">
              Select muscle groups for Day {activeDay} first to add a custom exercise.
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <input
              className="col-span-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              placeholder="Exercise name"
              value={newExName}
              onChange={(e) => setNewExName(e.target.value)}
            />

            {/* Select matches input styling */}
            <select
              className="bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40 disabled:opacity-50"
              value={newExGroup}
              onChange={(e) => setNewExGroup(e.target.value)}
              disabled={selectedGroupsForDay.length === 0}
            >
              {selectedGroupsForDay.map((mg) => (
                <option key={mg} value={mg} className="bg-slate-900 text-white">
                  {mg.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={createCustomExercise}
            disabled={selectedGroupsForDay.length === 0}
            className="w-full bg-white text-slate-900 font-medium py-2 rounded-xl text-sm hover:bg-slate-100 active:scale-[0.99] transition disabled:opacity-60"
          >
            Add exercise
          </button>
        </div>

        {/* Exercise pool (filtered by selected muscle groups) */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-3">
          <div className="text-xs text-slate-300 mb-2">Pick exercises</div>

          {selectedGroupsForDay.length === 0 ? (
            <div className="text-[11px] text-slate-400 px-2 py-3">
              Choose muscle groups above to see matching exercises.
            </div>
          ) : (
            <>
              <input
                list="exercise-suggestions"
                className="w-full mb-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <datalist id="exercise-suggestions">
                {suggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>

              <div className="max-h-60 overflow-auto space-y-2 pr-1">
                {filteredPool.length === 0 ? (
                  <div className="text-[11px] text-slate-400 px-2 py-3">
                    No matches in selected muscle groups. Try a different search or add a custom exercise.
                  </div>
                ) : (
                  filteredPool.map((ex) => {
                    const picked = selectedIds.includes(ex.id);
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => toggleExercise(activeDay, ex.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                          picked
                            ? "bg-emerald-400/20 border-emerald-400/40 text-white"
                            : "bg-white/5 border-white/15 text-slate-100 hover:bg-white/10"
                        }`}
                        title={picked ? "Click to remove from this day" : "Click to add to this day"}
                      >
                        <div className="text-sm">{ex.name}</div>
                        <div className="text-[11px] text-slate-300">
                          {String(ex.muscleGroup).replaceAll("_", " ").toLowerCase()}
                          {ex.isGlobal ? " • global" : " • yours"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          disabled={saving || !canSave}
          onClick={savePlan}
          className="w-full bg-emerald-400 text-slate-900 font-medium py-2.5 rounded-xl text-sm hover:bg-emerald-300 active:scale-[0.99] transition disabled:opacity-60"
          title={!canSave ? "Choose at least 1 muscle group and 1 exercise in every day" : ""}
        >
          {saving ? "Saving..." : "Save my plan"}
        </button>

        {!canSave ? (
          <div className="text-[11px] text-amber-300 text-center">
            You must select at least 1 muscle group and 1 exercise in every day.
          </div>
        ) : null}
      </div>
    </AuthCard>
  );
}
