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


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/plan-setup" element={<PlanSetup />} />
        <Route path="/plan-builder" element={<PlanBuilder />} />
        <Route path="/home" element={<Home />} />
        <Route path="/workout/:id" element={<Workout />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
