import React from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { CATEGORIES } from "../../utils/categories.js";

const styles = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.2rem 0",
    cursor: "pointer",
  },
  checkbox: { cursor: "pointer", accentColor: "#339AF0" },
  dot: (color) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  label: { fontSize: "0.8rem", color: "#cbd5e1", userSelect: "none" },
  actions: { display: "flex", gap: "0.5rem", marginBottom: "0.4rem" },
  btn: {
    fontSize: "0.7rem",
    background: "none",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: "3px",
    padding: "2px 6px",
    cursor: "pointer",
  },
};

export default function CategoryFilter() {
  const { categories, setCategories } = useScanner();
  const allKeys = Object.keys(CATEGORIES);

  const toggle = (key) => {
    if (categories.includes(key)) {
      setCategories(categories.filter((k) => k !== key));
    } else {
      setCategories([...categories, key]);
    }
  };

  return (
    <div>
      <div style={styles.actions}>
        <button style={styles.btn} onClick={() => setCategories(allKeys)}>All</button>
        <button style={styles.btn} onClick={() => setCategories([])}>None</button>
      </div>
      {allKeys.map((key) => {
        const cat = CATEGORIES[key];
        return (
          <label key={key} style={styles.row}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={categories.includes(key)}
              onChange={() => toggle(key)}
            />
            <span style={styles.dot(cat.color)} />
            <span style={{ color: cat.color, fontWeight: 700, fontSize: "0.65rem", flexShrink: 0 }}>[{key}]</span>
            <span style={styles.label}>{cat.label}</span>
          </label>
        );
      })}
    </div>
  );
}
