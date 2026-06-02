import { useScanStore } from '../../store/scanStore.js';

export default function AreaSelector() {
  const { area, setArea } = useScanStore();

  const update = (field) => (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setArea({ ...area, [field]: val });
  };

  return (
    <div>
      <label style={styles.label}>Khu vực quét</label>
      <div style={styles.row}>
        <Field label="Vĩ độ (Lat)" value={area.lat} step="0.0001" onChange={update('lat')} />
        <Field label="Kinh độ (Lng)" value={area.lng} step="0.0001" onChange={update('lng')} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={styles.subLabel}>Bán kính: {area.radiusM} m</label>
        <input
          type="range"
          min={100}
          max={15000}
          step={100}
          value={area.radiusM}
          onChange={(e) => setArea({ ...area, radiusM: parseInt(e.target.value, 10) })}
          style={styles.range}
        />
        <div style={styles.rangeLabels}>
          <span>100m</span><span>15km</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, step, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={styles.subLabel}>{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={onChange}
        style={styles.input}
      />
    </div>
  );
}

const styles = {
  label: { display: 'block', color: '#909296', fontSize: 12, marginBottom: 6, fontWeight: 500 },
  subLabel: { display: 'block', color: '#909296', fontSize: 11, marginBottom: 3 },
  row: { display: 'flex', gap: 8 },
  input: {
    width: '100%', background: '#25262b', color: '#c1c2c5', border: '1px solid #373a40',
    borderRadius: 6, padding: '6px 8px', fontSize: 12, boxSizing: 'border-box',
  },
  range: { width: '100%', marginTop: 4, accentColor: '#339AF0' },
  rangeLabels: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#5c5f66' },
};
