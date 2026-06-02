import { useScanStore } from '../../store/scanStore.js';

export default function ScanButton() {
  const { loading, progress, error, categories, runScan, resetResults } = useScanStore();

  return (
    <div>
      <button
        onClick={runScan}
        disabled={loading || categories.length === 0}
        style={{
          ...styles.btn,
          opacity: loading || categories.length === 0 ? 0.5 : 1,
          cursor: loading || categories.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Đang quét...' : '🔍 Quét khu vực'}
      </button>
      {progress && !error && <p style={styles.progress}>{progress}</p>}
      {error && (
        <div style={styles.error}>
          <span>⚠ {error}</span>
          <button onClick={resetResults} style={styles.clearBtn}>✕</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  btn: {
    width: '100%', background: '#1971c2', color: '#fff', border: 'none',
    borderRadius: 7, padding: '10px 0', fontSize: 13, fontWeight: 600,
    transition: 'opacity 0.15s',
  },
  progress: { color: '#51CF66', fontSize: 12, marginTop: 6, textAlign: 'center' },
  error: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#2c1b1b', border: '1px solid #c92a2a', borderRadius: 6,
    padding: '6px 10px', marginTop: 6, color: '#ff6b6b', fontSize: 12,
  },
  clearBtn: {
    background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: 14,
  },
};
