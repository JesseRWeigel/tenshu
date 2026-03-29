import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CronJob } from '@tenshu/shared'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pause, Play, RefreshCw } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function Cron() {
  const queryClient = useQueryClient()
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'

  const { data: jobs = [], isLoading } = useQuery<CronJob[]>({
    queryKey: ['cron'],
    queryFn: () => fetch('/api/cron').then((r) => r.json()),
    refetchInterval: 10000,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      fetch(`/api/cron/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cron'] }),
  })

  const runMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/cron/${id}/run`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cron'] }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-400">Loading cron jobs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Scheduled Operations</h1>
      <ThemedPageHeader kanji="定時任務" title="SCHEDULED OPS" />

      {jobs.length === 0 ? (
        <p className="text-zinc-500">No cron jobs configured</p>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <ThemedCard key={job.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-100">{job.name}</span>
                  <Badge
                    variant="outline"
                    className="text-xs font-mono"
                    style={{ borderColor: `${accent}44`, color: accent }}
                  >
                    {job.schedule}
                  </Badge>
                  {job.lastStatus && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        job.lastStatus === 'success'
                          ? 'text-emerald-500 border-emerald-500'
                          : 'text-red-500 border-red-500'
                      }`}
                    >
                      {job.lastStatus}
                    </Badge>
                  )}
                  {!job.enabled && (
                    <Badge
                      variant="outline"
                      className="text-xs text-zinc-500 border-zinc-500"
                    >
                      paused
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: job.id,
                        enabled: !job.enabled,
                      })
                    }
                    disabled={toggleMutation.isPending}
                  >
                    {job.enabled ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runMutation.mutate(job.id)}
                    disabled={runMutation.isPending}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                {job.nextRun && (
                  <span>Next: {new Date(job.nextRun).toLocaleString()}</span>
                )}
                {job.lastRun && (
                  <span>Last: {new Date(job.lastRun).toLocaleString()}</span>
                )}
              </div>
            </ThemedCard>
          ))}
        </div>
      )}
    </div>
  )
}
