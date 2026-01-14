import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import PlanSetup from "./pages/PlanSetup";
import PlanBuilder from "./pages/PlanBuilder";
import Workout from "./pages/Workout";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";
import RequirePlan from "./components/RequiredPlan";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan-setup" element={<PlanSetup />} />
        <Route path="/plan-builder" element={<PlanBuilder />} />
        <Route
          path="/home"
          element={
            <RequirePlan>
              <Home />
            </RequirePlan>
          }
        />
        <Route
          path="/workout/:id"
          element={
            <RequirePlan>
              <Workout />
            </RequirePlan>
          }
        />
        <Route
          path="/stats"
          element={
            <RequirePlan>
              <Stats />
            </RequirePlan>
          }
        />
        <Route
          path="/settings"
          element={
            <RequirePlan>
              <Settings />
            </RequirePlan>
          }
        />
        </Routes>
    </Router>
  );
}

export default App;
