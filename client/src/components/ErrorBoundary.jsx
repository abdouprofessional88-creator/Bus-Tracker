import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          padding: '2rem',
          direction: 'rtl',
        }}>
          <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ marginBottom: '0.5rem', color: '#991b1b' }}>حدث خطأ غير متوقع</h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {this.state.error?.message || 'يرجى المحاولة مرة أخرى'}
            </p>
            <details style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1rem' }}>
              <summary>تفاصيل الخطأ</summary>
              <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
              className="btn btn-primary"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
