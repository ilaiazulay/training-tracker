const STORAGE_KEY = "training-tracker-auth";

export function saveAuthData({ user, tokens }) {
  const data = { user, tokens };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAuthData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthData() {
  localStorage.removeItem(STORAGE_KEY);
}
