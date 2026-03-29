import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'
import { useDemo } from '@/hooks/useDemo'

interface LogEntry {
  timestamp: string
  type: string
  agent: string
  task: string
  result_length: number
  score: number
  verdict: string
}

interface ArtifactSummary {
  name: string
  type: 'research' | 'coder' | 'qa'
  task: string
  timestamp: string
  sizeKB: number
  preview: string
}

interface CurrentCycle {
  running: boolean
  cycle: string
  task: string
  lastAgent: string
  lastStatus: string
  recentLines: string[]
}

const TYPE_COLORS: Record<string, string> = {
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  coding: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  qa_review: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  self_improvement: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  planning: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
}

const ARTIFACT_COLORS: Record<string, string> = {
  research: 'text-blue-400',
  coder: 'text-purple-400',
  qa: 'text-amber-400',
}

interface CycleStage {
  agent: string
  role: string
  durationSec: number
  status: 'done' | 'active' | 'pending'
}

interface CycleTimeline {
  cycle: number
  task: string
  stages: CycleStage[]
  totalSec: number
}

const STAGE_COLORS: Record<string, string> = {
  planner: '#06b6d4',
  researcher: '#3b82f6',
  coder: '#8b5cf6',
  qa: '#f59e0b',
  comms: '#22c55e',
}

function generateDemoTimelines(): CycleTimeline[] {
  const tasks = [
    'code-review',
    'tool-building',
    'ai-self-improvement-research',
    'improve-gameplay',
  ]
  const roles = ['planner', 'researcher', 'coder', 'qa']
  const timelines: CycleTimeline[] = []
  for (let i = 0; i < 5; i++) {
    const stages: CycleStage[] = roles.map((role, j) => ({
      agent: role.charAt(0).toUpperCase() + role.slice(1),
      role,
      durationSec: 30 + Math.floor(Math.random() * 200),
      status:
        i === 0 && j === roles.length - 1
          ? ('active' as const)
          : ('done' as const),
    }))
    timelines.push({
      cycle: 42 - i,
      task: tasks[i % tasks.length],
      stages,
      totalSec: stages.reduce((s, st) => s + st.durationSec, 0),
    })
  }
  return timelines
}

function CycleWaterfall({
  timelines,
  accent,
}: {
  timelines: CycleTimeline[]
  accent: string
}) {
  if (timelines.length === 0) return null
  const maxTotal = Math.max(...timelines.map((t) => t.totalSec))

  return (
    <ThemedCard>
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
        Cycle Timeline
      </p>
      <div className="flex items-center gap-3 mb-3 text-[10px] text-zinc-500">
        {Object.entries(STAGE_COLORS).map(([role, color]) => (
          <span key={role} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {role}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {timelines.map((tl) => (
          <div key={tl.cycle} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono w-6">
              #{tl.cycle}
            </span>
            <div
              className="flex-1 flex h-5 rounded overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              {tl.stages.map((stage, j) => {
                const widthPct =
                  maxTotal > 0 ? (stage.durationSec / maxTotal) * 100 : 25
                return (
                  <div
                    key={j}
                    className="h-full relative group"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor:
                        stage.status === 'active'
                          ? `${STAGE_COLORS[stage.role]}cc`
                          : `${STAGE_COLORS[stage.role]}88`,
                      borderRight:
                        j < tl.stages.length - 1
                          ? '1px solid rgba(0,0,0,0.3)'
                          : undefined,
                    }}
                    title={`${stage.agent} (${stage.role}) — ${Math.floor(stage.durationSec / 60)}m ${stage.durationSec % 60}s`}
                  >
                    {stage.status === 'active' && (
                      <div
                        className="absolute inset-0 animate-pulse"
                        style={{ backgroundColor: `${accent}33` }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <span className="text-[10px] text-zinc-600 font-mono w-10 text-right">
              {Math.floor(tl.totalSec / 60)}m{tl.totalSec % 60}s
            </span>
          </div>
        ))}
      </div>
    </ThemedCard>
  )
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Activity() {
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'
  const { isDemo } = useDemo()
  const demoTimelines = useMemo(
    () => (isDemo ? generateDemoTimelines() : []),
    [isDemo],
  )

  const { data: current } = useQuery<CurrentCycle>({
    queryKey: ['activity-current'],
    queryFn: () => fetch('/api/activity/current').then((r) => r.json()),
    refetchInterval: 5000,
  })

  const { data: log = [] } = useQuery<LogEntry[]>({
    queryKey: ['activity-log'],
    queryFn: () => fetch('/api/activity/log?limit=30').then((r) => r.json()),
    refetchInterval: 10000,
  })

  const { data: artifacts = [] } = useQuery<ArtifactSummary[]>({
    queryKey: ['activity-artifacts'],
    queryFn: () =>
      fetch('/api/activity/artifacts?limit=8').then((r) => r.json()),
    refetchInterval: 15000,
  })

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Activity Log</h1>
      <ThemedPageHeader kanji="作戦記録" title="ACTIVITY LOG" />

      {/* Current Cycle */}
      {current?.running && (
        <ThemedCard glow>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-3 w-3 rounded-full animate-pulse"
              style={{ backgroundColor: accent }}
            />
            <span className="font-semibold" style={{ color: accent }}>
              Cycle #{current.cycle} — {current.task}
            </span>
          </div>
          {current.lastAgent && (
            <p className="text-sm text-zinc-400 mb-2">
              Last: {current.lastStatus || `Waiting on ${current.lastAgent}`}
            </p>
          )}
          <div
            className="rounded p-3 font-mono text-xs text-zinc-500 max-h-40 overflow-y-auto"
            style={{
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            {current.recentLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes('>>')
                    ? 'text-zinc-300'
                    : line.includes('<<')
                      ? 'text-emerald-400'
                      : line.includes('!!')
                        ? 'text-red-400'
                        : ''
                }
              >
                {line}
              </div>
            ))}
          </div>
        </ThemedCard>
      )}

      {/* Cycle Timeline Waterfall */}
      {(isDemo || current?.running) && (
        <CycleWaterfall timelines={demoTimelines} accent={accent} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Log */}
        <div className="space-y-3">
          <h2
            className="text-sm font-medium tracking-wider uppercase"
            style={{ color: `${accent}99` }}
          >
            Agent Log
          </h2>
          {log.map((entry, i) => (
            <ThemedCard key={i} className="!p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={TYPE_COLORS[entry.type] || 'text-zinc-400'}
                  >
                    {entry.type}
                  </Badge>
                  <span className="text-sm font-medium">{entry.agent}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {timeAgo(entry.timestamp)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">{entry.task}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                <span>{entry.result_length.toLocaleString()} chars</span>
                {entry.score > 0 && <span>{entry.score}/10</span>}
                {entry.verdict && (
                  <span
                    className={
                      entry.verdict === 'PASS'
                        ? 'text-emerald-400'
                        : entry.verdict === 'FAIL'
                          ? 'text-red-400'
                          : 'text-amber-400'
                    }
                  >
                    {entry.verdict}
                  </span>
                )}
              </div>
            </ThemedCard>
          ))}
          {log.length === 0 && (
            <p className="text-zinc-500 text-sm">No activity yet.</p>
          )}
        </div>

        {/* Recent Artifacts */}
        <div className="space-y-3">
          <h2
            className="text-sm font-medium tracking-wider uppercase"
            style={{ color: `${accent}99` }}
          >
            Recent Artifacts
          </h2>
          {artifacts.map((art, i) => (
            <ThemedCard key={i} className="!p-3">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${ARTIFACT_COLORS[art.type] || 'text-zinc-400'}`}
                >
                  {art.type} — {art.task}
                </span>
                <span className="text-xs text-zinc-500">{art.sizeKB}KB</span>
              </div>
              <p className="text-xs text-zinc-500 mb-1">{art.timestamp}</p>
              {art.preview && (
                <p className="text-xs text-zinc-400 line-clamp-2">
                  {art.preview}
                </p>
              )}
            </ThemedCard>
          ))}
          {artifacts.length === 0 && (
            <p className="text-zinc-500 text-sm">No artifacts yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
