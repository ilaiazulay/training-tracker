// src/pages/Settings.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import BottomNav from "../components/BottomNav";
import { getAuthData, clearAuthData, saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PLAN_TYPES = [
  { value: "AB", label: "AB" },
  { value: "ABC", label: "ABC" },
  { value: "ABCD", label: "ABCD" },
  { value: "FULL_BODY", label: "Full Body" },
];

export default function Settings() {
  const nav = useNavigate();

  const [checking, setChecking] = useState(true);

  const [authData, setAuthData] = useState(() => getAuthData());
  const token = authData?.tokens?.accessToken;

  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPlanType, setSavingPlanType] = useState(false);

  const [name, setName] = useState(authData?.user?.name || "");
  const [gender, setGender] = useState(authData?.user?.gender || "");
  const [age, setAge] = useState(authData?.user?.age ?? "");
  const [heightCm, setHeightCm] = useState(authData?.user?.heightCm ?? "");

  const [planType, setPlanType] = useState(authData?.user?.planType || "AB");

  const planTypeChanged = useMemo(() => {
    return (authData?.user?.planType || "") !== planType;
  }, [authData, planType]);

  function logout() {
    clearAuthData();
    nav("/");
  }

  useEffect(() => {
    const a = getAuthData();
    setAuthData(a);

    if (!a || !a.tokens?.accessToken) {
      nav("/");
      return;
    }

    // keep local fields in sync if storage changed (rare but helps)
    setName(a?.user?.name || "");
    setGender(a?.user?.gender || "");
    setAge(a?.user?.age ?? "");
    setHeightCm(a?.user?.heightCm ?? "");
    setPlanType(a?.user?.planType || "AB");

    setChecking(false);
  }, [nav]);

  async function saveProfile() {
    try {
      setError("");
      setSavingProfile(true);

      const res = await fetch(`${API_BASE_URL}/user/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim() || null,
          gender: gender || null,
          age: age === "" ? null : Number(age),
          heightCm: heightCm === "" ? null : Number(heightCm),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save profile");

      const updatedUser = data.user || data.me || null;
      if (updatedUser) {
        const next = { ...authData, user: { ...authData.user, ...updatedUser } };
        saveAuthData(next);
        setAuthData(next);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePlanTypeAndRebuild() {
    try {
      setError("");
      setSavingPlanType(true);

      const res = await fetch(`${API_BASE_URL}/user/me/plan-type`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update plan type");

      const updatedUser = data.user || {};
      const next = {
        ...authData,
        user: {
          ...authData.user,
          planType: updatedUser.planType ?? planType,
          hasConfiguredPlan: false,
        },
      };

      saveAuthData(next);
      setAuthData(next);

      nav("/plan-builder");
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingPlanType(false);
    }
  }

  if (!authData) return null;

  return (
    <AuthCard
      title="Settings"
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
          active="settings"
          onNavigate={(to) => {
            if (to !== "settings") nav(`/${to}`);
          }}
        />
      }
    >
      <div className="flex flex-col min-h-[420px]">
        <ErrorAlert message={error} />

        {checking ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" label="Loading settings..." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* PLAN SECTION */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-white font-semibold mb-3">Workout plan</div>

              <div className="space-y-3">
                <Field label="Plan type">
                  <select
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    disabled={savingPlanType || savingProfile}
                  >
                    {PLAN_TYPES.map((p) => (
                      <option key={p.value} value={p.value} className="bg-slate-900 text-white">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <button
                  type="button"
                  onClick={changePlanTypeAndRebuild}
                  disabled={savingPlanType || !planTypeChanged}
                  className="w-full py-2.5 rounded-2xl bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60"
                  title={!planTypeChanged ? "Choose a different plan type to enable" : ""}
                >
                  {savingPlanType ? "Updating..." : "Change & rebuild plan"}
                </button>

                <button
                  type="button"
                  onClick={() => nav("/plan-builder?edit=1")}
                  disabled={savingPlanType || savingProfile}
                  className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/15 text-white text-sm hover:bg-white/10 transition disabled:opacity-60"
                >
                  Edit current workout plan
                </button>

                <div className="text-[11px] text-slate-400">
                  Changing plan type will send you to the builder to create a new plan.
                </div>
              </div>
            </div>

            {/* PROFILE SECTION */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-white font-semibold mb-3">Profile</div>

              <div className="space-y-3">
                <Field label="Name">
                  <input
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={savingProfile}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Gender">
                    <select
                      className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={savingProfile}
                    >
                      <option value="" className="bg-slate-900 text-white">
                        —
                      </option>
                      <option value="MALE" className="bg-slate-900 text-white">
                        Male
                      </option>
                      <option value="FEMALE" className="bg-slate-900 text-white">
                        Female
                      </option>
                    </select>
                  </Field>

                  <Field label="Age">
                    <input
                      className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="—"
                      disabled={savingProfile}
                    />
                  </Field>
                </div>

                <Field label="Height (cm)">
                  <input
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="—"
                    disabled={savingProfile}
                  />
                </Field>

                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={saveProfile}
                  className="w-full py-2.5 rounded-2xl bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 mt-2"
                >
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthCard>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  );
}
