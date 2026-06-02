import { useScanStore } from '../../store/scanStore.js';
import { useExport } from '../../hooks/useExport.js';
import { CATEGORIES } from '../../utils/categories.js';
import { formatDistance } from '../../utils/geo.js';

export default function ResultsTable() {
  const { points, filter, setHoveredPoint } = useScanStore();
  const { download, hasResults } = useExport();

  const visible = filter ? points.filter((p) => p.category === filter) : points;

  if (!hasResults) return null;

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <span style={styles.count}>{visible.length} địa điểm</span>
        <div style={styles.exportBtns}>
          <ExportBtn label="CSV" onClick={() => download('csv')} />
          <ExportBtn label="GeoJSON" onClick={() => download('geojson')} />
          <ExportBtn label="KML" onClick={() => download('kml')} />
        </div>
      </div>
      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Loại', 'Tên', 'Khoảng cách', 'Điểm'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const cat = CATEGORIES[p.category] ?? {};
              return (
                <tr
                  key={p.id}
                  style={styles.tr}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <td style={styles.td}>
                    <span style={{ color: cat.color }}>{cat.icon} {cat.label ?? p.category}</span>
                  </td>
                  <td style={{ ...styles.td, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name || '—'}
                  </td>
                  <td style={styles.td}>{p.distanceM != null ? formatDistance(p.distanceM) : '—'}</td>
                  <td style={styles.td}>{p.score ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={styles.exportBtn}>{label}</button>
  );
}

const styles = {
  container: {
    background: '#1a1b1e', borderTop: '1px solid #2c2e33',
    display: 'flex', flexDirection: 'column', maxHeight: 240,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', borderBottom: '1px solid #2c2e33',
  },
  count: { color: '#909296', fontSize: 12 },
  exportBtns: { display: 'flex', gap: 6 },
  exportBtn: {
    background: '#25262b', border: '1px solid #373a40', color: '#c1c2c5',
    borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
  },
  scroll: { overflowY: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    color: '#5c5f66', fontWeight: 500, padding: '5px 12px',
    textAlign: 'left', borderBottom: '1px solid #2c2e33', position: 'sticky', top: 0, background: '#1a1b1e',
  },
  tr: { cursor: 'default', transition: 'background 0.1s' },
  td: { color: '#c1c2c5', padding: '5px 12px', borderBottom: '1px solid #25262b' },
};
