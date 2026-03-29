import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'
import { useDemo } from '@/hooks/useDemo'

interface KnowledgeArtifact {
  name: string
  type: 'research' | 'coder' | 'qa' | 'misc'
  task: string
  agent: string
  timestamp: string
  sizeKB: number
  preview: string
}

interface ArtifactDetail {
  name: string
  content: string
  type: string
  task: string
  agent: string
  timestamp: string
  sizeKB: number
}

interface KnowledgeStats {
  total: number
  totalSizeKB: number
  byType: Record<string, number>
  byAgent: Record<string, number>
}

const TYPE_COLORS: Record<string, string> = {
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  coder: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  qa: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  misc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}

// Demo data
function generateDemoArtifacts(): KnowledgeArtifact[] {
  const types: KnowledgeArtifact['type'][] = ['research', 'coder', 'qa']
  const tasks = [
    'ai-self-improvement-research',
    'tool-building',
    'capability-assessment',
    'frontier-scan',
    'repo-contribution',
    'resource-acquisition',
  ]
  const agents: Record<string, string> = {
    research: 'Senku',
    coder: 'Bulma',
    qa: 'Vegeta',
  }
  const previews = [
    'This research explores the frontier of recursive self-improvement patterns in multi-agent architectures...',
    'Implemented a new tool for automated dependency analysis with graph-based traversal...',
    'Quality assessment of the latest code generation output — testing edge cases and error handling...',
    'Survey of emerging AI capabilities in code generation, reasoning, and autonomous task completion...',
    'Built a Python script for automated knowledge extraction from research artifacts...',
  ]
  const artifacts: KnowledgeArtifact[] = []
  for (let i = 0; i < 30; i++) {
    const type = types[i % types.length]
    const task = tasks[i % tasks.length]
    const d = new Date(Date.now() - i * 3600000)
    artifacts.push({
      name: `${type}-${task}-${d
        .toISOString()
        .replace(/[-T:]/g, '')
        .slice(0, 15)
        .replace(/^(\d{8})(\d{6}).*/, '$1-$2')}.md`,
      type,
      task,
      agent: agents[type] || 'unknown',
      timestamp: d.toISOString().slice(0, 19).replace('T', ' '),
      sizeKB: 2 + Math.floor(Math.random() * 30),
      preview: previews[i % previews.length],
    })
  }
  return artifacts
}

const DEMO_STATS: KnowledgeStats = {
  total: 30,
  totalSizeKB: 332,
  byType: { research: 10, coder: 10, qa: 10 },
  byAgent: { Senku: 10, Bulma: 10, Vegeta: 10 },
}

export function Knowledge() {
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'
  const { isDemo } = useDemo()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data: listData } = useQuery<{
    artifacts: KnowledgeArtifact[]
    total: number
  }>({
    queryKey: ['knowledge', debouncedSearch, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (typeFilter) params.set('type', typeFilter)
      params.set('limit', '50')
      return fetch(`/api/knowledge?${params}`).then((r) => r.json())
    },
    enabled: !isDemo,
    refetchInterval: 30000,
  })

  const { data: stats } = useQuery<KnowledgeStats>({
    queryKey: ['knowledge-stats'],
    queryFn: () => fetch('/api/knowledge/stats').then((r) => r.json()),
    enabled: !isDemo,
    refetchInterval: 60000,
  })

  const { data: realDetail } = useQuery<ArtifactDetail>({
    queryKey: ['knowledge-artifact', selectedArtifact],
    queryFn: () =>
      fetch(`/api/knowledge/artifact/${selectedArtifact}`).then((r) =>
        r.json(),
      ),
    enabled: !!selectedArtifact && !isDemo,
  })

  const demoArtifacts = useMemo(
    () => (isDemo ? generateDemoArtifacts() : []),
    [isDemo],
  )

  // In demo mode, generate fake detail from the selected artifact
  const detail = useMemo(() => {
    if (isDemo && selectedArtifact) {
      const art = demoArtifacts.find((a) => a.name === selectedArtifact)
      if (!art) return undefined
      return {
        name: art.name,
        content: `# ${art.task.replace(/-/g, ' ')}\n\nAgent: ${art.agent}\nType: ${art.type}\nTimestamp: ${art.timestamp}\n\n---\n\n${art.preview}\n\nThis is a demo artifact preview. In production, the full markdown content of the research artifact would be displayed here, including code blocks, analysis, and recommendations generated by the agent during the orchestration cycle.\n\n## Key Findings\n\n- Finding 1: Lorem ipsum analysis result\n- Finding 2: Performance metrics and benchmarks\n- Finding 3: Recommendations for next cycle\n\n## Next Steps\n\n1. Apply findings to improve agent capabilities\n2. Feed results back into the orchestrator knowledge base\n3. Track improvements across subsequent cycles`,
        type: art.type,
        task: art.task,
        agent: art.agent,
        timestamp: art.timestamp,
        sizeKB: art.sizeKB,
      } as ArtifactDetail
    }
    return realDetail
  }, [isDemo, selectedArtifact, demoArtifacts, realDetail])
  const artifacts = isDemo ? demoArtifacts : (listData?.artifacts ?? [])
  const total = isDemo ? 30 : (listData?.total ?? 0)
  const knowledgeStats = isDemo ? DEMO_STATS : stats

  const filteredArtifacts = isDemo
    ? artifacts.filter((a) => {
        if (typeFilter && a.type !== typeFilter) return false
        if (
          debouncedSearch &&
          !a.name.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
          !a.task.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
          return false
        return true
      })
    : artifacts

  const handleClose = useCallback(() => setSelectedArtifact(null), [])

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Knowledge Base</h1>
      <ThemedPageHeader kanji="智庫" title="KNOWLEDGE BASE" />

      {/* Stats Row */}
      {knowledgeStats && (
        <div className="grid grid-cols-4 gap-3">
          <ThemedCard>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Artifacts
            </p>
            <p className="text-2xl font-bold" style={{ color: accent }}>
              {knowledgeStats.total}
            </p>
          </ThemedCard>
          <ThemedCard>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Total Size
            </p>
            <p className="text-2xl font-bold text-zinc-100">
              {knowledgeStats.totalSizeKB}KB
            </p>
          </ThemedCard>
          {Object.entries(knowledgeStats.byType)
            .slice(0, 2)
            .map(([type, count]) => (
              <ThemedCard key={type}>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  {type}
                </p>
                <p className="text-2xl font-bold text-zinc-100">{count}</p>
              </ThemedCard>
            ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3 items-center" role="search">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search artifacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-white/5 border text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1"
            style={{ borderColor: `${accent}33`, outlineColor: accent }}
            aria-label="Search artifacts"
          />
        </div>
        <div className="flex gap-1">
          {['', 'research', 'coder', 'qa'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-2.5 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background:
                  typeFilter === t ? `${accent}22` : 'rgba(255,255,255,0.03)',
                color: typeFilter === t ? accent : '#71717a',
                border: `1px solid ${typeFilter === t ? `${accent}44` : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              {t || 'All'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-500" aria-live="polite">
        {filteredArtifacts.length} of {total} artifacts
      </p>

      {/* Artifact Detail Modal */}
      {selectedArtifact && (
        <ThemedCard glow>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: accent }}>
              {detail?.task?.replace(/-/g, ' ') || selectedArtifact}
            </span>
            <button
              onClick={handleClose}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              Close
            </button>
          </div>
          {detail ? (
            <div
              className="rounded p-4 font-mono text-xs text-zinc-400 max-h-96 overflow-y-auto whitespace-pre-wrap"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {detail.content}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Loading...</p>
          )}
          <div className="flex gap-3 mt-2 text-xs text-zinc-500">
            <span>{detail?.agent}</span>
            <span>{detail?.sizeKB}KB</span>
            <span>{detail?.timestamp}</span>
          </div>
        </ThemedCard>
      )}

      {/* Artifact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filteredArtifacts.map((art) => (
          <ThemedCard
            key={art.name}
            className="!p-3 cursor-pointer hover:brightness-110 transition-all"
            onClick={() => setSelectedArtifact(art.name)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={TYPE_COLORS[art.type] || 'text-zinc-400'}
                >
                  {art.type}
                </Badge>
                <span className="text-sm font-medium text-zinc-200 truncate max-w-48">
                  {art.task.replace(/-/g, ' ')}
                </span>
              </div>
              <span className="text-xs text-zinc-600">{art.sizeKB}KB</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <span>{art.agent}</span>
              <span>·</span>
              <span>{art.timestamp}</span>
            </div>
            {art.preview && (
              <p className="text-xs text-zinc-400 line-clamp-2">
                {art.preview}
              </p>
            )}
          </ThemedCard>
        ))}
      </div>

      {filteredArtifacts.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">
          No artifacts found.
        </p>
      )}
    </div>
  )
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
