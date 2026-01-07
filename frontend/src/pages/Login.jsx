import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import { saveAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ----- GOOGLE LOGIN -----
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
        body: JSON.stringify({ idToken }), // no planType here for login
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Google login failed");
      }

      const data = await res.json();

      // Save user + tokens
      saveAuthData(data);
      const user = data.user;
      if (!user.hasCompletedOnboarding) {
        navigate("/onboarding");
      } else {
        navigate("/home");
      }      
    } catch (err) {
      console.error(err);
      setError(err.message || "Google login failed");
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
        setError("Please fill email and password.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Login failed");
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
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back">
      <div className="space-y-4">
        {/* Google login */}
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
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-3">
          Don't have an account?{" "}
          <Link to="/signup" className="text-slate-100 underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export default Login;
