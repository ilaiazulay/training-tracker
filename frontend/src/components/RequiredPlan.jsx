// src/components/RequirePlan.jsx
import { Navigate, useLocation } from "react-router-dom";
import { getAuthData } from "../auth";

export default function RequirePlan({ children }) {
  const location = useLocation();
  const auth = getAuthData();

  if (!auth?.tokens?.accessToken) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const user = auth?.user;

  // 🚫 Plan type chosen but plan NOT configured yet
  if (!user?.hasConfiguredPlan) {
    return <Navigate to="/plan-setup" replace />;
  }

  return children;
}
