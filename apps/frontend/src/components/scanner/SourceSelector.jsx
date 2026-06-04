import React, { useEffect, useState } from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { scanAPI } from "../../services/api.js";

const styles = {
  select: {
    width: "100%",
    padding: "0.4rem 0.5rem",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  badge: (available) => ({
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: available ? "#51CF66" : "#FF6B6B",
    marginRight: "6px",
  }),
};

export default function SourceSelector() {
  const { source, setSource } = useScanner();
  const [sources, setSources] = useState([]);

  useEffect(() => {
    scanAPI.sources()
      .then((data) => setSources(data.sources || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <select
        style={styles.select}
        value={source.id}
        onChange={(e) => setSource({ id: e.target.value, config: {} })}
      >
        {sources.length === 0 ? (
          <option value="overpass">OpenStreetMap (Overpass)</option>
        ) : (
          sources.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.available}>
              {s.available ? "" : "[N/A] "}{s.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
