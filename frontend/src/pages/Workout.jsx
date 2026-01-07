// src/pages/Workout.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
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

  if (stat.kind === "NORMAL") {
    return `${stat.weight}×${stat.reps}`;
  }

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

export default function Workout() {
  const { id } = useParams();
  const nav = useNavigate();
  const authData = getAuthData();
  const accessToken = authData?.tokens?.accessToken;

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Drop set modal state
  const [dropOpenForWE, setDropOpenForWE] = useState(null); // workoutExerciseId
  const [dropMain, setDropMain] = useState({ weight: "", reps: "" });
  const [dropParts, setDropParts] = useState([{ weight: "", reps: "" }]);
  const [savingDrop, setSavingDrop] = useState(false);

  function logout() {
    clearAuthData();
    nav("/");
  }

  async function fetchWorkout() {
    const res = await fetch(`${API_BASE_URL}/workouts/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Failed to load workout");
    return data.workout;
  }

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
        setLoading(true);
        const w = await fetchWorkout();
        if (!cancelled) setWorkout(w);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, nav]); // important: accessToken only

  async function refreshWorkout() {
    try {
      const w = await fetchWorkout();
      setWorkout(w);
    } catch (e) {
      setError(e.message);
    }
  }

  function getStatsForExercise(exerciseId) {
    return workout?.statsByExerciseId?.[String(exerciseId)] || null;
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

  async function addNormalSet(workoutExerciseId, exerciseId) {
    try {
      setError("");

      const stats = getStatsForExercise(exerciseId);
      const last = stats?.last;
      const prefill = prefillFromLastBest(last);

      const we = exercises.find((x) => x.id === workoutExerciseId);
      const lastNormal = we?.normalSets?.length ? we.normalSets[we.normalSets.length - 1] : null;
      const nextIndex = lastNormal ? lastNormal.setIndex + 1 : 0;

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

      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateNormalSet(workoutExerciseId, setIndex, weight, reps) {
    try {
      setError("");

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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save set");

      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    }
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update set");

      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeSet(setId) {
    try {
      setError("");

      const res = await fetch(`${API_BASE_URL}/workouts/${id}/sets/${setId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete set");

      await refreshWorkout();
    } catch (e) {
      setError(e.message);
    }
  }

  function openDropSetModal(workoutExerciseId, exerciseId) {
    const stats = getStatsForExercise(exerciseId);
    const last = stats?.last;
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
      if (!Number.isFinite(mainW) || !Number.isFinite(mainR)) {
        throw new Error("Please fill main drop set weight + reps");
      }

      const cleanDrops = dropParts
        .filter((p) => String(p.weight).trim() !== "" || String(p.reps).trim() !== "")
        .map((p) => ({ weight: Number(p.weight), reps: Number(p.reps) }));

      for (const d of cleanDrops) {
        if (!Number.isFinite(d.weight) || !Number.isFinite(d.reps)) {
          throw new Error("Drop sets must have valid weight + reps");
        }
      }

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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create drop set");

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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete drop set");

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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to complete workout");

      nav("/home");
    } catch (e) {
      setError(e.message);
    } finally {
      setCompleting(false);
    }
  }

  if (!authData) return null;

  return (
    <>
      {/* Logout top-right (outside card) */}
      <button
        type="button"
        onClick={logout}
        className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white text-xs hover:bg-white/10 transition"
      >
        Logout
      </button>

      <AuthCard title={workoutLabel} onBack={() => nav("/home")}>
        <div className="space-y-4">
          <ErrorAlert message={error} />

          {loading ? (
            <div className="text-center text-slate-300 text-sm">Loading...</div>
          ) : !workout ? (
            <div className="text-center text-slate-300 text-sm">Workout not found</div>
          ) : (
            <>
              {/* Subheader */}
              <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                <div className="text-xs text-slate-400">
                  Status:{" "}
                  <span className="text-white font-medium">
                    {workout.status === "PLANNED" ? "IN PROGRESS" : workout.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Exercises:{" "}
                  <span className="text-white font-medium">{workout.exercises.length}</span>
                </div>
              </div>

              {/* Exercise cards */}
              {exercises.map((we) => {
                const stats = getStatsForExercise(we.exerciseId);
                const lastText = formatStat(stats?.last);
                const prText = formatStat(stats?.pr);

                return (
                  <div
                    key={we.id}
                    className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/20 flex-shrink-0 border border-white/10">
                        {we.exercise.imageUrl ? (
                          <img
                            src={we.exercise.imageUrl}
                            alt={we.exercise.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Name + stats */}
                      <div className="flex-1">
                        <div className="text-white font-semibold">{we.exercise.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {prettyMuscle(we.exercise.muscleGroup)}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {lastText ? (
                            <span className="px-2 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-slate-200">
                              Last best:{" "}
                              <span className="font-semibold text-white">{lastText}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-slate-400">
                              No last data
                            </span>
                          )}

                          {prText ? (
                            <span className="px-2 py-1 rounded-full text-[11px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
                              PR:{" "}
                              <span className="font-semibold text-emerald-100">{prText}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => addNormalSet(we.id, we.exerciseId)}
                          className="px-3 py-1.5 rounded-xl text-sm border border-white/15 bg-white/5 text-white hover:bg-white/10 transition"
                        >
                          + Set
                        </button>

                        <button
                          type="button"
                          onClick={() => openDropSetModal(we.id, we.exerciseId)}
                          className="px-3 py-1.5 rounded-xl text-sm border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 transition"
                        >
                          + Drop
                        </button>
                      </div>
                    </div>

                    {/* NORMAL Sets */}
                    {we.normalSets.length > 0 ? (
                      <div className="space-y-2">
                        {we.normalSets.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <div className="text-xs text-slate-300 w-10">#{s.setIndex + 1}</div>

                            <input
                              className="w-20 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                              type="number"
                              step="0.5"
                              value={s.weight}
                              onChange={(e) =>
                                updateNormalSet(we.id, s.setIndex, e.target.value, s.reps)
                              }
                            />
                            <div className="text-xs text-slate-400">kg</div>

                            <input
                              className="w-16 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                              type="number"
                              value={s.reps}
                              onChange={(e) =>
                                updateNormalSet(we.id, s.setIndex, s.weight, e.target.value)
                              }
                            />
                            <div className="text-xs text-slate-400">reps</div>

                            <button
                              type="button"
                              onClick={() => removeSet(s.id)}
                              className="ml-auto text-xs text-red-300 hover:text-red-200 transition"
                              title="Remove set"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No sets logged yet</div>
                    )}

                    {/* DROP SET GROUPS */}
                    {we.dropGroups.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {we.dropGroups.map((g) => (
                          <div
                            key={g.groupId}
                            className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-emerald-100">Drop set</div>
                              <button
                                type="button"
                                onClick={() => deleteDropGroup(g.groupId)}
                                className="text-xs text-red-200 hover:text-red-100 transition"
                              >
                                Delete
                              </button>
                            </div>

                            <div className="space-y-2">
                              {g.main ? (
                                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                  <div className="text-[11px] text-emerald-200 w-12">Main</div>
                                  <input
                                    className="w-20 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                                    type="number"
                                    step="0.5"
                                    value={g.main.weight}
                                    onChange={(e) =>
                                      updateAnySetById(g.main.id, e.target.value, g.main.reps)
                                    }
                                  />
                                  <div className="text-xs text-slate-200">kg</div>
                                  <input
                                    className="w-16 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                                    type="number"
                                    value={g.main.reps}
                                    onChange={(e) =>
                                      updateAnySetById(g.main.id, g.main.weight, e.target.value)
                                    }
                                  />
                                  <div className="text-xs text-slate-200">reps</div>
                                </div>
                              ) : null}

                              {g.parts.map((p, idx) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                  <div className="text-[11px] text-emerald-200 w-12">
                                    Drop {idx + 1}
                                  </div>
                                  <input
                                    className="w-20 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                                    type="number"
                                    step="0.5"
                                    value={p.weight}
                                    onChange={(e) => updateAnySetById(p.id, e.target.value, p.reps)}
                                  />
                                  <div className="text-xs text-slate-200">kg</div>
                                  <input
                                    className="w-16 bg-white/5 border border-white/15 rounded-xl px-2 py-1.5 text-sm text-white outline-none focus:border-white/40"
                                    type="number"
                                    value={p.reps}
                                    onChange={(e) =>
                                      updateAnySetById(p.id, p.weight, e.target.value)
                                    }
                                  />
                                  <div className="text-xs text-slate-200">reps</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={completeWorkout}
                disabled={completing}
                className="w-full bg-emerald-400 text-slate-900 font-medium py-2.5 rounded-xl text-sm hover:bg-emerald-300 active:scale-[0.99] transition disabled:opacity-60"
              >
                {completing ? "Completing..." : "Finish workout"}
              </button>
            </>
          )}
        </div>

        {/* ✅ Drop set modal (Portal / always centered) */}
        <Modal
          open={!!dropOpenForWE}
          title="Add drop set"
          description="Main set + optional drops"
          onClose={() => setDropOpenForWE(null)}
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-300 mb-2">Main</div>
              <div className="flex items-center gap-2">
                <input
                  className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40"
                  type="number"
                  step="0.5"
                  placeholder="kg"
                  value={dropMain.weight}
                  onChange={(e) => setDropMain((x) => ({ ...x, weight: e.target.value }))}
                />
                <input
                  className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40"
                  type="number"
                  placeholder="reps"
                  value={dropMain.reps}
                  onChange={(e) => setDropMain((x) => ({ ...x, reps: e.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-300">Drops</div>
                <button
                  type="button"
                  onClick={() => setDropParts((arr) => [...arr, { weight: "", reps: "" }])}
                  className="text-xs px-2 py-1 rounded-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition"
                >
                  + Add drop
                </button>
              </div>

              <div className="space-y-2">
                {dropParts.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40"
                      type="number"
                      step="0.5"
                      placeholder="kg"
                      value={p.weight}
                      onChange={(e) =>
                        setDropParts((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, weight: e.target.value } : x))
                        )
                      }
                    />
                    <input
                      className="w-24 bg-white/5 border border-white/15 rounded-xl px-2 py-2 text-sm text-white outline-none focus:border-white/40"
                      type="number"
                      placeholder="reps"
                      value={p.reps}
                      onChange={(e) =>
                        setDropParts((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, reps: e.target.value } : x))
                        )
                      }
                    />

                    <button
                      type="button"
                      className="ml-auto text-xs text-red-300 hover:text-red-200 transition"
                      onClick={() => setDropParts((arr) => arr.filter((_, i) => i !== idx))}
                      title="Remove drop"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDropOpenForWE(null)}
                className="flex-1 py-2.5 rounded-2xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDrop}
                onClick={saveDropSet}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-400 text-slate-900 font-semibold hover:bg-emerald-300 transition text-sm disabled:opacity-60"
              >
                {savingDrop ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      </AuthCard>
    </>
  );
}
