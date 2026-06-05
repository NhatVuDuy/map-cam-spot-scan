import React from "react";
import { HashRouter as BrowserRouter, Routes, Route } from "react-router-dom";
import Scanner from "./pages/Scanner.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Scanner />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
