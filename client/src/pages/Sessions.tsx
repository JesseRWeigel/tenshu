import { useQuery } from '@tanstack/react-query'
import type { Session } from '@tenshu/shared'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'

export function Sessions() {
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions').then((r) => r.json()),
    refetchInterval: 10000,
  })

  const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0)
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-400">Loading sessions...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Sessions</h1>
      <ThemedPageHeader kanji="通信" title="SESSIONS" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Active
          </p>
          <p className="text-2xl font-bold" style={{ color: accent }}>
            {sessions.length}
          </p>
          <p className="text-xs text-zinc-500">sessions</p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Total Cost
          </p>
          <p className="text-2xl font-bold text-zinc-100">
            ${totalCost.toFixed(4)}
          </p>
          <p className="text-xs text-zinc-500">this period</p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Tokens
          </p>
          <p className="text-2xl font-bold text-zinc-100">
            {totalTokens.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">total consumed</p>
        </ThemedCard>
      </div>

      {sessions.length === 0 ? (
        <p className="text-zinc-500">No active sessions</p>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <ThemedCard key={session.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-100">
                    {session.agentId}
                  </span>
                  {session.label && (
                    <span className="text-sm text-zinc-400">
                      {session.label}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: `${accent}44`, color: accent }}
                  >
                    {session.model}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: accent }}>
                    ${session.cost.toFixed(4)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {session.totalTokens.toLocaleString()} tokens
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                <span>In: {session.inputTokens.toLocaleString()}</span>
                <span>Out: {session.outputTokens.toLocaleString()}</span>
                <span>
                  Started: {new Date(session.startedAt).toLocaleTimeString()}
                </span>
              </div>
            </ThemedCard>
          ))}
        </div>
      )}
    </div>
  )
}
