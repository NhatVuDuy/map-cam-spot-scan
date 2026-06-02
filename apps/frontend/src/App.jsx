import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import Scanner from './pages/Scanner.jsx';
import NotFound from './pages/NotFound.jsx';

class MapErrorBoundary extends Error {}

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ff6b6b', padding: 24 }}>
          <strong>Map error:</strong> {this.state.error?.message}
          <br />
          <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 8 }}>
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.root}>
        <Header />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Scanner />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#141517',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
};
