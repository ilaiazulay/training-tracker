// src/pages/Onboarding.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import PlanSelector from "../components/PlanSelector";
import ErrorAlert from "../components/ErrorAlert";
import { getAuthData, saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Onboarding() {
  const navigate = useNavigate();
  const authData = getAuthData();

  // ---- STATE ----
  const [planType, setPlanType] = useState("AB");
  const [gender, setGender] = useState("MALE"); // or "" if you want no default
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Debug: see state
  useEffect(() => {
    console.log("FRONT planType state:", planType);
  }, [planType]);

  useEffect(() => {
    if (!authData) {
      navigate("/");
      return;
    }

    if (authData.user.hasCompletedOnboarding) {
      navigate("/plan-setup");
      return;
    }

    // We DO NOT override planType here; we let the user choose it now
    // If you want to prefill gender/age/height later you can, but not planType
  }, [authData, navigate]);

  if (!authData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);

      const token = authData.tokens.accessToken;

      const body = {
        gender,
        age: age ? Number(age) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        planType, // 👈 comes from STATE ONLY
      };

      console.log("SUBMIT onboarding body (frontend):", body);

      const res = await fetch(`${API_BASE_URL}/user/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save onboarding data");
      }

      const data = await res.json();

      const newAuthData = {
        ...authData,
        user: data.user,
      };
      saveAuthData(newAuthData);

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save onboarding data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Set up your profile">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorAlert message={error} />

        {/* TRAINING SPLIT */}
        <div>
          <label className="block text-xs text-slate-300 mb-1">
            Training split
          </label>
          <PlanSelector planType={planType} onChange={setPlanType} />
        </div>

        {/* GENDER */}
        <div>
          <label className="block text-xs text-slate-300 mb-1">
            Gender (optional)
          </label>
          <div className="flex gap-2">
            {["MALE", "FEMALE"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 text-xs py-2 rounded-xl border transition ${
                  gender === g
                    ? "bg-white text-slate-900 border-white"
                    : "border-white/20 text-slate-200 hover:bg-white/5"
                }`}
              >
                {g === "MALE" ? "male" : "female"}
              </button>
            ))}
          </div>
        </div>

        {/* AGE + HEIGHT */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Age (optional)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Height (cm, optional)
            </label>
            <input
              type="number"
              min="120"
              max="230"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
              placeholder="Height"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-slate-900 font-medium py-2.5 rounded-xl text-sm mt-2 hover:bg-slate-100 active:scale-[0.99] transition disabled:opacity-60"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </AuthCard>
  );
}

export default Onboarding;