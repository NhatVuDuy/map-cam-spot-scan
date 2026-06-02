export default function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <span style={styles.icon}>📷</span>
        <span style={styles.title}>Camera Placement Scanner</span>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: 52,
    background: '#1a1b1e',
    borderBottom: '1px solid #2c2e33',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    flexShrink: 0,
    zIndex: 100,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  icon: { fontSize: 22 },
  title: { color: '#c1c2c5', fontSize: 15, fontWeight: 600, letterSpacing: 0.3 },
};
