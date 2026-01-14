import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAuthData } from "../auth";

export default function RequireReadyUser() {
  const location = useLocation();
  const auth = getAuthData();

  const token = auth?.tokens?.accessToken;
  const user = auth?.user;

  // 1) Not logged in
  if (!auth || !token || !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 2) Onboarding not done => onboarding (NOT plan-setup)
  if (!user.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // 3) Onboarding done but plan not configured => plan setup
  if (!user.hasConfiguredPlan) {
    return <Navigate to="/plan-setup" replace />;
  }

  // 4) Ready
  return <Outlet />;
}
