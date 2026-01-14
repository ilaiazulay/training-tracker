import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import ErrorAlert from "../components/ErrorAlert";
import BottomNav from "../components/BottomNav";
import { getAuthData, clearAuthData } from "../auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Settings() {
  const nav = useNavigate();

  const [authData] = useState(() => getAuthData());
  const token = authData?.tokens?.accessToken;

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // simple editable fields
  const [name, setName] = useState(authData?.user?.name || "");
  const [gender, setGender] = useState(authData?.user?.gender || "");
  const [age, setAge] = useState(authData?.user?.age || "");
  const [heightCm, setHeightCm] = useState(authData?.user?.heightCm || "");

  function logout() {
    clearAuthData();
    nav("/");
  }

  useEffect(() => {
    if (!authData || !token) nav("/");
  }, [authData, token, nav]);

  async function saveProfile() {
    try {
      setError("");
      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/users/me`, {
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
      if (!res.ok) throw new Error(data.message || "Failed to save");

      // Optional: Refresh local auth data here if needed
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
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
      <div className="space-y-4">
        <ErrorAlert message={error} />

        {/* Removed extra pb-24 padding as AuthCard handles it */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="text-white font-semibold mb-3">Profile</div>

            <div className="space-y-3">
              <Field label="Name">
                <input
                  className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender">
                  <select
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </Field>

                <Field label="Age">
                  <input
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="—"
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
                />
              </Field>

              <button
                type="button"
                disabled={saving}
                onClick={saveProfile}
                className="w-full py-2.5 rounded-2xl bg-emerald-400 text-slate-900 text-sm font-semibold hover:bg-emerald-300 transition disabled:opacity-60 mt-2"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <div className="text-[11px] text-slate-400">
                If saving doesn’t work yet, ensure backend has
                <span className="text-slate-300"> PATCH /users/me</span>.
              </div>
            </div>
          </div>
        </div>
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