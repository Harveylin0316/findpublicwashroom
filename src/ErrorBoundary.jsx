import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>出了點問題</h1>
          <p>應用程式遇到非預期錯誤，重新整理試試？</p>
          {this.state.error?.message && (
            <pre className="error-detail">{this.state.error.message}</pre>
          )}
          <button onClick={() => location.reload()}>重新整理</button>
        </div>
      )
    }
    return this.props.children
  }
}
