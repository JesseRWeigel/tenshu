import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ResultRow } from '@tenshu/shared'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'
import { useDemo } from '@/hooks/useDemo'
import { useMockResults } from '@/hooks/useMockData'

const STATUS_COLORS: Record<ResultRow['status'], string> = {
  keep: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  discard: 'bg-red-500/10 text-red-400 border-red-500/30',
  crash: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  skip: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}

function ScoreBar({ score, accent }: { score: number; accent: string }) {
  const pct = (score / 10) * 100
  const color =
    score >= 8
      ? '#10b981'
      : score >= 6
        ? accent
        : score >= 4
          ? '#f59e0b'
          : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-20 h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono w-8">{score.toFixed(1)}</span>
    </div>
  )
}

function ScoreTrendChart({
  rows,
  accent,
}: {
  rows: ResultRow[]
  accent: string
}) {
  const scores = rows.slice(-20).map((r) => r.score)
  if (scores.length === 0) return null

  // Compute ratchet floor: highest "keep" score seen so far
  let ratchetFloor = 0
  const ratchetPoints: number[] = []
  for (let i = 0; i < scores.length; i++) {
    const row = rows[rows.length - 20 + i] ?? rows[i]
    if (row && row.status === 'keep' && row.score > ratchetFloor) {
      ratchetFloor = row.score
    }
    ratchetPoints.push(ratchetFloor)
  }

  const maxScore = 10
  const h = 80
  const w = scores.length > 1 ? scores.length - 1 : 1

  return (
    <ThemedCard glow>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">
          Score Trend (last {scores.length})
        </p>
        <div className="flex items-center gap-4 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-0.5 rounded"
              style={{ backgroundColor: accent }}
            />{' '}
            score
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-0.5 rounded border-t border-dashed"
              style={{ borderColor: '#10b981' }}
            />{' '}
            ratchet floor
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-20"
        preserveAspectRatio="none"
      >
        {/* Ratchet floor line */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          opacity="0.5"
          points={ratchetPoints
            .map((s, i) => `${(i / w) * w},${h - (s / maxScore) * h}`)
            .join(' ')}
        />
        {/* Score line */}
        <polyline
          fill="none"
          stroke={accent}
          strokeWidth="1"
          strokeLinejoin="round"
          points={scores
            .map((s, i) => `${(i / w) * w},${h - (s / maxScore) * h}`)
            .join(' ')}
        />
        {/* Score dots */}
        {scores.map((s, i) => {
          const dotColor =
            s >= 8
              ? '#10b981'
              : s >= 6
                ? accent
                : s >= 4
                  ? '#f59e0b'
                  : '#ef4444'
          return (
            <circle
              key={i}
              cx={(i / w) * w}
              cy={h - (s / maxScore) * h}
              r="1.5"
              fill={dotColor}
            >
              <title>{s.toFixed(1)}</title>
            </circle>
          )
        })}
      </svg>
    </ThemedCard>
  )
}

function TaskBreakdown({
  rows,
  accent,
}: {
  rows: ResultRow[]
  accent: string
}) {
  const taskStats = useMemo(() => {
    const map: Record<string, { total: number; sum: number; keeps: number }> =
      {}
    for (const r of rows) {
      if (!map[r.task]) map[r.task] = { total: 0, sum: 0, keeps: 0 }
      map[r.task].total++
      map[r.task].sum += r.score
      if (r.status === 'keep') map[r.task].keeps++
    }
    return Object.entries(map)
      .map(([task, s]) => ({
        task,
        avg: s.sum / s.total,
        count: s.total,
        keepRate: s.keeps / s.total,
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [rows])

  if (taskStats.length === 0) return null

  const maxAvg = Math.max(...taskStats.map((t) => t.avg), 1)

  return (
    <ThemedCard>
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
        Task Type Performance
      </p>
      <div className="space-y-2">
        {taskStats.map((t) => (
          <div key={t.task} className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 w-40 truncate font-mono">
              {t.task}
            </span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(t.avg / maxAvg) * 100}%`,
                  backgroundColor:
                    t.avg >= 8
                      ? '#10b981'
                      : t.avg >= 6
                        ? accent
                        : t.avg >= 4
                          ? '#f59e0b'
                          : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-400 w-8">
              {t.avg.toFixed(1)}
            </span>
            <span className="text-[10px] text-zinc-600 w-6">{t.count}x</span>
          </div>
        ))}
      </div>
    </ThemedCard>
  )
}

export function Results() {
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'
  const { isDemo } = useDemo()
  const mock = useMockResults()
  const [agentFilter, setAgentFilter] = useState<string>('all')

  const { data: realRows = [], isLoading: realLoading } = useQuery<ResultRow[]>(
    {
      queryKey: ['results'],
      queryFn: () => fetch('/api/results').then((r) => r.json()),
      refetchInterval: 30000,
      enabled: !isDemo,
    },
  )

  const rows = isDemo ? mock.data : realRows
  const isLoading = isDemo ? false : realLoading

  const agents = useMemo(() => {
    const set = new Set(rows.map((r) => r.agent))
    return ['all', ...Array.from(set).sort()]
  }, [rows])

  const filtered = useMemo(
    () =>
      agentFilter === 'all'
        ? rows
        : rows.filter((r) => r.agent === agentFilter),
    [rows, agentFilter],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-400">Loading results...</p>
      </div>
    )
  }

  const kept = filtered.filter((r) => r.status === 'keep')
  const avgScore =
    filtered.length > 0
      ? filtered.reduce((sum, r) => sum + r.score, 0) / filtered.length
      : 0
  const successRate =
    filtered.length > 0 ? Math.round((kept.length / filtered.length) * 100) : 0

  const displayRows = [...filtered].reverse()

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Results</h1>
      <div className="flex items-center justify-between">
        <ThemedPageHeader kanji="戦績" title="BATTLE RECORD" />
        {/* Agent filter tabs */}
        <div className="flex items-center gap-1">
          {agents.map((a) => (
            <button
              key={a}
              onClick={() => setAgentFilter(a)}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                backgroundColor:
                  agentFilter === a ? `${accent}22` : 'transparent',
                color: agentFilter === a ? accent : '#71717a',
                border:
                  agentFilter === a
                    ? `1px solid ${accent}44`
                    : '1px solid transparent',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Total Cycles
          </p>
          <p className="text-2xl font-bold mt-1">{filtered.length}</p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Kept</p>
          <p className="text-2xl font-bold mt-1" style={{ color: accent }}>
            {kept.length}
          </p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Avg Score
          </p>
          <p className="text-2xl font-bold mt-1">{avgScore.toFixed(1)}</p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Success Rate
          </p>
          <p className="text-2xl font-bold mt-1">{successRate}%</p>
        </ThemedCard>
      </div>

      {/* Score trend with ratchet + Task breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScoreTrendChart rows={filtered} accent={accent} />
        <TaskBreakdown rows={filtered} accent={accent} />
      </div>

      {/* Results table */}
      {rows.length === 0 ? (
        <p className="text-zinc-500">
          No results yet. Run an orchestrator cycle to generate data.
        </p>
      ) : (
        <ThemedCard className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-zinc-500 text-xs uppercase tracking-wide"
                style={{ borderColor: `${accent}22` }}
              >
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Cycle</th>
                <th className="text-left py-2 px-3">Task</th>
                <th className="text-left py-2 px-3">Agent</th>
                <th className="text-left py-2 px-3">Score</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b hover:bg-white/[0.02]"
                  style={{ borderColor: `${accent}11` }}
                >
                  <td className="py-2 px-3 text-zinc-500 text-xs font-mono whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 px-3 font-mono">#{row.cycle}</td>
                  <td className="py-2 px-3 text-zinc-300">{row.task}</td>
                  <td className="py-2 px-3 text-zinc-400">{row.agent}</td>
                  <td className="py-2 px-3">
                    <ScoreBar score={row.score} accent={accent} />
                  </td>
                  <td className="py-2 px-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[row.status]}`}
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-zinc-500 text-xs max-w-xs truncate">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ThemedCard>
      )}
    </div>
  )
}
