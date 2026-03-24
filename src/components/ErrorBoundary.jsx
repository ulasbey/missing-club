import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[MissingClub] Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#020617', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧩</div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>Something went wrong</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Don't worry — your scores are safe.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
            >
              Reload Game
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
