import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Scanner from "./pages/Scanner.jsx";
import Sys from "./pages/Sys.jsx";
import Plan from "./pages/Plan.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"     element={<Scanner />} />
        <Route path="/info" element={<Landing />} />
        <Route path="/sys"  element={<Sys />} />
        <Route path="/plan" element={<Plan />} />
        {/* Legacy redirect */}
        <Route path="/map"  element={<Navigate to="/" replace />} />
        <Route path="*"     element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}
