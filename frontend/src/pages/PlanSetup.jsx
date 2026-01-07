import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import { getAuthData, saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function PlanSetup() {
  const navigate = useNavigate();
  const authData = getAuthData();

  const [error, setError] = useState("");
  const [loadingDefault, setLoadingDefault] = useState(false);

  useEffect(() => {
    if (!authData) {
      navigate("/");
      return;
    }

    // If user already has plan, skip
    if (authData.user.hasConfiguredPlan) {
      navigate("/home");
    }
  }, [authData, navigate]);

  if (!authData) return null;

  const handleUseDefault = async () => {
    try {
      setError("");
      setLoadingDefault(true);

      const token = authData.tokens.accessToken;

      const res = await fetch(`${API_BASE_URL}/plan/default`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create default plan");
      }

      const data = await res.json();

      // Update user in local storage with hasConfiguredPlan = true
      const newAuthData = {
        ...authData,
        user: {
          ...authData.user,
          hasConfiguredPlan: data.user.hasConfiguredPlan,
        },
      };
      saveAuthData(newAuthData);

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create default plan");
    } finally {
      setLoadingDefault(false);
    }
  };

  const handleBuildCustom = () => {
    // later: navigate to a custom builder page
    // for now, we can just alert or navigate to a placeholder
    navigate("/plan-builder"); // you'll create this later
  };

  return (
    <AuthCard title="Choose your training plan">
      <div className="space-y-4">
        <ErrorAlert message={error} />

        <p className="text-xs text-slate-300 text-center">
          Split chosen:{" "}
          <span className="font-semibold">
            {authData.user.planType.replace("_", " ")}
          </span>
        </p>

        <div className="space-y-3 mt-2">
          <button
            onClick={handleUseDefault}
            disabled={loadingDefault}
            className="w-full bg-emerald-400 text-slate-900 font-medium py-2.5 rounded-xl text-sm hover:bg-emerald-300 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loadingDefault ? "Creating plan..." : "Use recommended plan"}
          </button>

          <button
            onClick={handleBuildCustom}
            className="w-full bg-white/5 text-slate-100 font-medium py-2.5 rounded-xl text-sm border border-white/20 hover:bg-white/10 active:scale-[0.99] transition"
          >
            Build my own (advanced)
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-3 text-center">
          You can always edit your plan later from Settings.
        </p>
      </div>
    </AuthCard>
  );
}

export default PlanSetup;
