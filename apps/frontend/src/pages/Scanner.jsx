import { useRef } from 'react';
import MapView from '../components/map/MapView.jsx';
import Legend from '../components/map/Legend.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import ResultsTable from '../components/scanner/ResultsTable.jsx';

export default function Scanner() {
  const mapRef = useRef(null);

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <div style={styles.mapArea}>
          <MapView mapRef={mapRef} />
          <Legend />
        </div>
        <ResultsTable />
      </div>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },
};
