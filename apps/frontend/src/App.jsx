import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Scanner from "./pages/Scanner.jsx";
import Sys from "./pages/Sys.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"    element={<Landing />} />
        <Route path="/map" element={<Scanner />} />
        <Route path="/sys" element={<Sys />} />
        <Route path="*"    element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}
