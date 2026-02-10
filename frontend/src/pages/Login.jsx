// src/pages/Login.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import Spinner from "../components/Spinner";
import { saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function finishLogin(data) {
    saveAuthData(data);
    const user = data.user;

    if (!user?.hasCompletedOnboarding) {
      navigate("/onboarding");
    } else {
      navigate("/home");
    }
  }

  // ----- GOOGLE LOGIN -----
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      setLoading(true);

      const idToken = credentialResponse?.credential;
      if (!idToken) throw new Error("Google login failed (missing token).");

      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Google login failed");

      await finishLogin(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed.");
  };

  // ----- EMAIL LOGIN -----
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);

      if (!email || !password) {
        throw new Error("Please fill email and password.");
      }

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Login failed");

      await finishLogin(data);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back">
      <div className="space-y-4">
        {/* Google login (keep visible, disable while loading) */}
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

          {/* Spinner shown while loading */}
          {loading ? <Spinner label="Signing in..." /> : null}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">
            or with email
          </span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Error */}
        <ErrorAlert message={error} />

        {/* Email login form */}
        <form className="space-y-3" onSubmit={handleEmailLogin}>
          <input
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            disabled={loading}
          />

          <input
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-slate-900 font-medium py-2.5 rounded-xl text-sm mt-2 hover:bg-slate-100 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-slate-900/40 border-t-transparent animate-spin" />
                Logging in...
              </span>
            ) : (
              "Log in"
            )}
          </button>
        </form>

        {/* Disable Sign up while loading */}
        <p className="text-center text-xs text-slate-400 mt-3">
          Don't have an account?{" "}
          {loading ? (
            <span className="text-slate-500">Sign up</span>
          ) : (
            <Link to="/signup" className="text-slate-100 underline">
              Sign up
            </Link>
          )}
        </p>
      </div>
    </AuthCard>
  );
}

export default Login;
