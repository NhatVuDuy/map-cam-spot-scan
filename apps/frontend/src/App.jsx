import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ background: "#060d1a", color: "#e2e8f0", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", fontFamily: "monospace", padding: "2rem" }}>
        <div style={{ fontSize: "2rem" }}>⚠️</div>
        <div style={{ fontWeight: 700, color: "#F87171", fontSize: "1rem" }}>Lỗi render</div>
        <pre style={{ background: "#0d1829", border: "1px solid #1e3354", borderRadius: "8px", padding: "1rem", fontSize: "0.75rem", color: "#94a3b8", maxWidth: "600px", overflow: "auto", whiteSpace: "pre-wrap" }}>
          {this.state.error?.message}{"\n"}{this.state.error?.stack}
        </pre>
        <button onClick={() => window.location.href = "/"} style={{ background: "none", border: "1px solid #1e3354", borderRadius: "7px", padding: "0.5rem 1.25rem", color: "#64748b", cursor: "pointer" }}>← Về trang chủ</button>
      </div>
    );
    return this.props.children;
  }
}
import Landing from "./pages/Landing.jsx";
import Scanner from "./pages/Scanner.jsx";
import Sys from "./pages/Sys.jsx";
import Plan from "./pages/Plan.jsx";
import CityHub from "./pages/CityHub.jsx";
import CityMap from "./pages/CityMap.jsx";
import WardDetail from "./pages/WardDetail.jsx";
import CityScans from "./pages/city/CityScans.jsx";
import ScanResult from "./pages/city/ScanResult.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        <Route path="/"              element={<Landing />} />
        <Route path="/scan"          element={<Scanner />} />
        <Route path="/city"          element={<CityScans defaultCityId="hcm" />} />
        <Route path="/city/report"   element={<ScanResult />} />
        <Route path="/city/map"      element={<CityMap />} />
        <Route path="/city/details"  element={<WardDetail />} />
        <Route path="/sys"           element={<Sys />} />
        {/* Legacy */}
        <Route path="/plan"          element={<Plan />} />
        <Route path="/city-hub"      element={<CityHub />} />
        <Route path="/city-map"      element={<Navigate to="/city/map" replace />} />
        <Route path="/info"          element={<Navigate to="/" replace />} />
        <Route path="/map"           element={<Navigate to="/scan" replace />} />
        <Route path="*"              element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
