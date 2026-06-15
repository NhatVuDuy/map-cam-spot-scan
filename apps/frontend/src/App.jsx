import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Scanner from "./pages/Scanner.jsx";
import Sys from "./pages/Sys.jsx";
import Plan from "./pages/Plan.jsx";
import CityHub from "./pages/CityHub.jsx";
import CityMap from "./pages/CityMap.jsx";
import WardDetail from "./pages/WardDetail.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"                element={<Landing />} />
        <Route path="/scan"            element={<Scanner />} />
        <Route path="/city"            element={<CityHub />} />
        <Route path="/city/ward/:code" element={<WardDetail />} />
        <Route path="/city-map"        element={<CityMap />} />
        <Route path="/sys"             element={<Sys />} />
        {/* Legacy: /plan still works, full dashboard preserved */}
        <Route path="/plan"            element={<Plan />} />
        {/* Legacy redirects */}
        <Route path="/info" element={<Navigate to="/" replace />} />
        <Route path="/map"  element={<Navigate to="/scan" replace />} />
        <Route path="*"     element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}
