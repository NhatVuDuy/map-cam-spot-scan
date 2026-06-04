import React from "react";
import Header from "../components/layout/Header.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import MapView from "../components/map/MapView.jsx";
import ResultsTable from "../components/scanner/ResultsTable.jsx";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "#0f172a",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
    minHeight: 0,
  },
  tableWrapper: {
    height: "220px",
    borderTop: "1px solid #1e293b",
    overflowY: "auto",
  },
};

export default function Scanner() {
  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.body}>
        <Sidebar />
        <div style={styles.main}>
          <div style={styles.mapWrapper}>
            <MapView />
          </div>
          <div style={styles.tableWrapper}>
            <ResultsTable />
          </div>
        </div>
      </div>
    </div>
  );
}
