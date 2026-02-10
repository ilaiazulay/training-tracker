// src/pages/Signup.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import AuthCard from "../components/AuthCard";
import PlanSelector from "../components/PlanSelector";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import { saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Signup() {
  const [planType, setPlanType] = useState("AB");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function finishAuth(data) {
    saveAuthData(data);
    const user = data.user;

    if (!user?.hasCompletedOnboarding) {
      navigate("/onboarding");
    } else {
      navigate("/home");
    }
  }

  // ----- GOOGLE SIGNUP -----
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      setLoading(true);

      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error("Google signup failed (missing token).");

      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          planType,
          nameFallback: name || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Google signup failed");

      await finishAuth(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Google signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed.");
  };

  // ----- EMAIL SIGNUP -----
  const handleEmailSignup = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      if (!name || !email || !password) {
        throw new Error("Please fill all fields.");
      }

      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, planType }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Signup failed");

      await finishAuth(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create your account">
      <div className="flex flex-col min-h-[520px]">
        <ErrorAlert message={error} />

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner size="lg" label="Creating account..." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plan selector */}
            <PlanSelector planType={planType} onChange={setPlanType} />

            {/* Google signup (visible, but will be disabled while loading) */}
            <div className="flex flex-col items-center gap-3">
              <div className={loading ? "opacity-60 pointer-events-none" : ""}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  shape="pill"
                  theme="outline"
                  size="large"
                  width="260"
                />
              </div>

              {loading ? <Spinner label="Signing in..." /> : null}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">or with email</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Email signup form */}
            <form className="space-y-3" onSubmit={handleEmailSignup}>
              <input
                disabled={loading}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40 disabled:opacity-60"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />

              <input
                disabled={loading}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40 disabled:opacity-60"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />

              <input
                disabled={loading}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40 disabled:opacity-60"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-slate-900 font-medium py-2.5 rounded-xl text-sm mt-2 hover:bg-slate-100 active:scale-[0.99] transition disabled:opacity-60"
              >
                Create account
              </button>
            </form>

            {/* Link to login */}
            <p className="text-center text-xs text-slate-400 mt-3">
              Already have an account?{" "}
              <Link
                to="/"
                className={[
                  "text-slate-100 underline",
                  loading ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
                aria-disabled={loading}
                tabIndex={loading ? -1 : 0}
              >
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthCard>
  );
}

export default Signup;
