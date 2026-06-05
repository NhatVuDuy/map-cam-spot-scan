import React from "react";
import Header from "../components/layout/Header.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import MapView from "../components/map/MapView.jsx";

export default function Scanner() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw",
      overflow: "hidden", background: "#060d1a",
    }}>
      <Header />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <MapView />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
