import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#c1c2c5' }}>
      <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
      <p>Trang không tồn tại.</p>
      <Link to="/" style={{ color: '#339AF0' }}>← Về trang chính</Link>
    </div>
  );
}
