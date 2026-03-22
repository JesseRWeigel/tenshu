import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './hooks/useTheme'
import { DemoProvider } from './hooks/useDemo'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/Sidebar'
import { ThemedMain } from './components/ThemedMain'
import { DemoBanner } from './components/DemoBanner'
import { Dashboard } from './pages/Dashboard'
import { Office } from './pages/Office'
import { Sessions } from './pages/Sessions'
import { Cron } from './pages/Cron'
import { Results } from './pages/Results'
import { System } from './pages/System'
import { Activity } from './pages/Activity'
import { Knowledge } from './pages/Knowledge'
import { Interactions } from './pages/Interactions'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
        <ThemeProvider>
          <BrowserRouter>
            <div className="flex h-screen bg-zinc-950 text-zinc-100">
              <Sidebar />
              <ThemedMain>
                <DemoBanner />
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/command" element={<Office />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/cron" element={<Cron />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/system" element={<System />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/knowledge" element={<Knowledge />} />
                    <Route path="/interactions" element={<Interactions />} />
                  </Routes>
                </ErrorBoundary>
              </ThemedMain>
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </DemoProvider>
    </QueryClientProvider>
  )
}

export default App
