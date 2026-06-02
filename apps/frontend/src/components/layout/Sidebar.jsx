import SourceSelector from '../scanner/SourceSelector.jsx';
import AreaSelector from '../scanner/AreaSelector.jsx';
import CategoryFilter from '../scanner/CategoryFilter.jsx';
import ScanButton from '../scanner/ScanButton.jsx';

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.section}><SourceSelector /></div>
      <div style={styles.divider} />
      <div style={styles.section}><AreaSelector /></div>
      <div style={styles.divider} />
      <div style={styles.section}><CategoryFilter /></div>
      <div style={styles.divider} />
      <div style={styles.section}><ScanButton /></div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 280,
    background: '#1a1b1e',
    borderRight: '1px solid #2c2e33',
    overflowY: 'auto',
    flexShrink: 0,
  },
  section: { padding: '14px 16px' },
  divider: { height: 1, background: '#2c2e33' },
};
