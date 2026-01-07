import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import AuthCard from "../components/AuthCard";
import PlanSelector from "../components/PlanSelector";
import ErrorAlert from "../components/ErrorAlert";
import { saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Signup() {
  // ----- state -----
  const [planType, setPlanType] = useState("AB");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ----- GOOGLE SIGNUP -----
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      setLoading(true);

      const idToken = credentialResponse.credential;

      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          planType,                 // <-- plan from PlanSelector
          nameFallback: name || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Google signup failed");
      }

      const data = await res.json();
      saveAuthData(data);
      const user = data.user;
      if (!user.hasCompletedOnboarding) {
        navigate("/onboarding");
      } else {
        navigate("/home");
      }      
    } catch (err) {
      console.error(err);
      setError(err.message || "Google signup failed");
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
        setError("Please fill all fields.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, planType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Signup failed");
      }

      const data = await res.json();
      saveAuthData(data);
      const user = data.user;
      if (!user.hasCompletedOnboarding) {
        navigate("/onboarding");
      } else {
        navigate("/home");
      }      
    } catch (err) {
      console.error(err);
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // ----- JSX (UI) -----
  return (
    <AuthCard title="Create your account">
      <div className="space-y-4">
        {/* 1. plan selector (AB / ABC / ...) */}
        <PlanSelector planType={planType} onChange={setPlanType} />

        {/* 2. Google login */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            shape="pill"
            theme="outline"
            size="large"
            width="260"
          />
        </div>

        {/* 3. divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">
            or with email
          </span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* 4. error message */}
        <ErrorAlert message={error} />

        {/* 5. email signup form */}
        <form className="space-y-3" onSubmit={handleEmailSignup}>
          <input
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-400 outline-none focus:border-white/40"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-slate-900 font-medium py-2.5 rounded-xl text-sm mt-2 hover:bg-slate-100 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* 6. link to login */}
        <p className="text-center text-xs text-slate-400 mt-3">
          Already have an account?{" "}
          <Link to="/" className="text-slate-100 underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export default Signup;
