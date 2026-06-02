import { useScanStore } from '../../store/scanStore.js';
import { CATEGORIES } from '../../utils/categories.js';

export default function Legend() {
  const { stats, filter, setFilter } = useScanStore();
  const hasStats = Object.keys(stats).length > 0;
  if (!hasStats) return null;

  return (
    <div style={styles.container}>
      {Object.entries(stats).map(([catId, count]) => {
        const cat = CATEGORIES[catId] ?? { label: catId, color: '#888', icon: '📍' };
        const active = filter === catId;
        return (
          <button
            key={catId}
            onClick={() => setFilter(active ? null : catId)}
            style={{
              ...styles.item,
              background: active ? '#25262b' : 'transparent',
              borderColor: active ? cat.color : 'transparent',
            }}
          >
            <span style={{ color: cat.color }}>{cat.icon}</span>
            <span style={styles.label}>{cat.label}</span>
            <span style={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute', bottom: 30, left: 12, zIndex: 10,
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 6, border: '1px solid',
    borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
    background: 'rgba(26,27,30,0.85)', backdropFilter: 'blur(4px)',
    transition: 'all 0.15s',
  },
  label: { color: '#c1c2c5', fontSize: 11 },
  count: {
    marginLeft: 'auto', background: '#25262b', color: '#909296',
    borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 600,
  },
};
