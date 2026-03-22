import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { fallback, children } = this.props

    if (error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset)
      }
      if (fallback) {
        return fallback
      }
      return <PageErrorFallback error={error} onReset={this.reset} />
    }

    return children
  }
}

interface PageErrorFallbackProps {
  error: Error
  onReset: () => void
}

export function PageErrorFallback({ error, onReset }: PageErrorFallbackProps) {
  const isDev = import.meta.env.DEV

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="rounded-xl p-8 max-w-md w-full text-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(39, 39, 42, 0.8) 0%, rgba(24, 24, 27, 0.8) 100%)',
          border: '1px solid rgba(161, 161, 170, 0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div className="text-4xl mb-4 opacity-60">&#x26A0;</div>
        <h2 className="text-lg font-light tracking-wide text-zinc-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          An unexpected error occurred while rendering this page.
        </p>
        {isDev && (
          <pre className="text-left text-xs text-red-400 bg-zinc-900/60 rounded-lg p-3 mb-6 overflow-auto max-h-40">
            {error.message}
          </pre>
        )}
        <button
          onClick={onReset}
          className="px-5 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors duration-200 cursor-pointer bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
