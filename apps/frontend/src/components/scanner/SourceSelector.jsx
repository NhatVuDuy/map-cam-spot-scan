import { useEffect, useState } from 'react';
import { useScanStore } from '../../store/scanStore.js';
import { fetchSources } from '../../services/api.js';

export default function SourceSelector() {
  const { source, setSource } = useScanStore();
  const [sources, setSources] = useState([]);

  useEffect(() => {
    fetchSources()
      .then(setSources)
      .catch(() => {
        setSources([
          { id: 'overpass', label: 'OpenStreetMap (Overpass)', available: true },
          { id: 'geojson', label: 'Local GeoJSON File', available: true },
        ]);
      });
  }, []);

  return (
    <div>
      <label style={styles.label}>Nguồn dữ liệu</label>
      <select
        value={source.id}
        onChange={(e) => setSource({ id: e.target.value, config: {} })}
        style={styles.select}
      >
        {sources.map((s) => (
          <option key={s.id} value={s.id} disabled={!s.available}>
            {s.label}{!s.available ? ' (unavailable)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  label: { display: 'block', color: '#909296', fontSize: 12, marginBottom: 6, fontWeight: 500 },
  select: {
    width: '100%', background: '#25262b', color: '#c1c2c5', border: '1px solid #373a40',
    borderRadius: 6, padding: '7px 10px', fontSize: 13, cursor: 'pointer',
  },
};
