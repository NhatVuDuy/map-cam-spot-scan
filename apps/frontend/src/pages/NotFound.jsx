import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "1rem", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "4rem", color: "#FF6B6B" }}>404</h1>
      <p>Page not found</p>
      <Link to="/" style={{ color: "#339AF0", textDecoration: "none" }}>Back to Scanner</Link>
    </div>
  );
}
