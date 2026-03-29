import { useRef, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { useTheme } from '@/hooks/useTheme'
import { useDemo } from '@/hooks/useDemo'

interface AgentNode {
  id: string
  name: string
  role: string
  tasksCompleted: number
  avgScore: number
}

interface DelegationEdge {
  from: string
  to: string
  count: number
  avgScore: number
  tasks: string[]
}

interface SimNode extends AgentNode {
  x: number
  y: number
  vx: number
  vy: number
}

const ROLE_COLORS: Record<string, string> = {
  planner: '#06b6d4',
  researcher: '#3b82f6',
  coder: '#8b5cf6',
  qa: '#f59e0b',
  comms: '#22c55e',
}

function generateDemoData(): { nodes: AgentNode[]; edges: DelegationEdge[] } {
  const nodes: AgentNode[] = [
    {
      id: 'planner',
      name: 'Erwin',
      role: 'planner',
      tasksCompleted: 170,
      avgScore: 6.2,
    },
    {
      id: 'researcher',
      name: 'Senku',
      role: 'researcher',
      tasksCompleted: 168,
      avgScore: 6.1,
    },
    {
      id: 'coder',
      name: 'Bulma',
      role: 'coder',
      tasksCompleted: 165,
      avgScore: 6.6,
    },
    {
      id: 'qa',
      name: 'Vegeta',
      role: 'qa',
      tasksCompleted: 160,
      avgScore: 6.4,
    },
    {
      id: 'comms',
      name: 'Jet',
      role: 'comms',
      tasksCompleted: 50,
      avgScore: 7.0,
    },
  ]
  const edges: DelegationEdge[] = [
    {
      from: 'planner',
      to: 'researcher',
      count: 168,
      avgScore: 6.3,
      tasks: ['ai-self-improvement', 'tool-building'],
    },
    {
      from: 'researcher',
      to: 'coder',
      count: 165,
      avgScore: 6.5,
      tasks: ['ai-self-improvement', 'tool-building'],
    },
    {
      from: 'coder',
      to: 'qa',
      count: 160,
      avgScore: 6.6,
      tasks: ['ai-self-improvement', 'tool-building'],
    },
    {
      from: 'planner',
      to: 'comms',
      count: 30,
      avgScore: 7.0,
      tasks: ['frontier-scan'],
    },
    {
      from: 'qa',
      to: 'coder',
      count: 45,
      avgScore: 5.2,
      tasks: ['tool-building'],
    }, // retries
  ]
  return { nodes, edges }
}

function InteractionGraph({
  nodes,
  edges,
  accent,
}: {
  nodes: AgentNode[]
  edges: DelegationEdge[]
  accent: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simNodesRef = useRef<SimNode[]>([])
  const animRef = useRef<number>(0)
  const [hovered, setHovered] = useState<string | null>(null)

  // Initialize simulation nodes in a circle
  useEffect(() => {
    const cx = 400
    const cy = 250
    const radius = 150
    simNodesRef.current = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2
      return {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      }
    })
  }, [nodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 800
    const H = 500
    canvas.width = W
    canvas.height = H

    let frame = 0

    function simulate() {
      const simNodes = simNodesRef.current
      if (simNodes.length === 0) return

      const cx = W / 2
      const cy = H / 2

      // Simple force simulation
      for (const node of simNodes) {
        // Center gravity
        node.vx += (cx - node.x) * 0.001
        node.vy += (cy - node.y) * 0.001

        // Repulsion between nodes
        for (const other of simNodes) {
          if (node === other) continue
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 5000 / (dist * dist)
          node.vx += (dx / dist) * force
          node.vy += (dy / dist) * force
        }
      }

      // Edge spring forces
      for (const edge of edges) {
        const from = simNodes.find((n) => n.id === edge.from)
        const to = simNodes.find((n) => n.id === edge.to)
        if (!from || !to) continue
        const dx = to.x - from.x
        const dy = to.y - from.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const targetDist = 180
        const force = (dist - targetDist) * 0.005
        from.vx += (dx / dist) * force
        from.vy += (dy / dist) * force
        to.vx -= (dx / dist) * force
        to.vy -= (dy / dist) * force
      }

      // Apply velocity with damping
      for (const node of simNodes) {
        node.vx *= 0.85
        node.vy *= 0.85
        node.x += node.vx
        node.y += node.vy
        // Bounds
        node.x = Math.max(60, Math.min(W - 60, node.x))
        node.y = Math.max(60, Math.min(H - 60, node.y))
      }
    }

    function draw() {
      if (!ctx) return
      frame++
      simulate()

      const simNodes = simNodesRef.current

      // Clear
      ctx.clearRect(0, 0, W, H)

      // Draw edges
      for (const edge of edges) {
        const from = simNodes.find((n) => n.id === edge.from)
        const to = simNodes.find((n) => n.id === edge.to)
        if (!from || !to) continue

        const dx = to.x - from.x
        const dy = to.y - from.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        // Edge line
        const highlighted = hovered === edge.from || hovered === edge.to
        ctx.strokeStyle = highlighted ? `${accent}aa` : `${accent}33`
        ctx.lineWidth = Math.min(edge.count / 30, 4) + (highlighted ? 1 : 0)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()

        // Arrowhead
        const arrowLen = 12
        const angle = Math.atan2(dy, dx)
        const arrowX = to.x - (dx / dist) * 35
        const arrowY = to.y - (dy / dist) * 35
        ctx.fillStyle = highlighted ? `${accent}cc` : `${accent}55`
        ctx.beginPath()
        ctx.moveTo(arrowX, arrowY)
        ctx.lineTo(
          arrowX - arrowLen * Math.cos(angle - 0.3),
          arrowY - arrowLen * Math.sin(angle - 0.3),
        )
        ctx.lineTo(
          arrowX - arrowLen * Math.cos(angle + 0.3),
          arrowY - arrowLen * Math.sin(angle + 0.3),
        )
        ctx.closePath()
        ctx.fill()

        // Animated particle along edge
        const t = ((frame * 2 + edge.count * 10) % 200) / 200
        const px = from.x + dx * t
        const py = from.y + dy * t
        ctx.fillStyle = ROLE_COLORS[edge.from] || accent
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1

        // Edge label (count)
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        ctx.fillStyle = 'rgba(161, 161, 170, 0.5)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${edge.count}x`, midX, midY - 8)
      }

      // Draw nodes
      for (const node of simNodes) {
        const color = ROLE_COLORS[node.role] || '#71717a'
        const isHovered = hovered === node.id
        const radius = 28 + (isHovered ? 4 : 0)

        // Glow
        if (isHovered) {
          ctx.shadowColor = color
          ctx.shadowBlur = 20
        }

        // Circle
        ctx.fillStyle = `${color}33`
        ctx.strokeStyle = `${color}88`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        ctx.shadowBlur = 0

        // Name
        ctx.fillStyle = color
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.name, node.x, node.y - 6)

        // Role
        ctx.fillStyle = 'rgba(161, 161, 170, 0.6)'
        ctx.font = '9px monospace'
        ctx.fillText(node.role, node.x, node.y + 8)

        // Score badge
        ctx.fillStyle =
          node.avgScore >= 7
            ? '#22c55e'
            : node.avgScore >= 5
              ? color
              : '#ef4444'
        ctx.font = 'bold 10px monospace'
        ctx.fillText(`${node.avgScore}`, node.x, node.y + 20)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [edges, accent, hovered])

  // Mouse hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const scaleX = 800 / rect.width
    const scaleY = 500 / rect.height

    const node = simNodesRef.current.find((n) => {
      const dx = n.x - x * scaleX
      const dy = n.y - y * scaleY
      return Math.sqrt(dx * dx + dy * dy) < 35
    })
    setHovered(node?.id || null)
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg"
      style={{ maxHeight: '500px', aspectRatio: '800/500' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    />
  )
}

export function Interactions() {
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'
  const { isDemo } = useDemo()

  const { data } = useQuery<{ nodes: AgentNode[]; edges: DelegationEdge[] }>({
    queryKey: ['interactions'],
    queryFn: () => fetch('/api/interactions').then((r) => r.json()),
    refetchInterval: 30000,
    enabled: !isDemo,
  })

  const demo = useMemo(() => (isDemo ? generateDemoData() : null), [isDemo])
  const nodes = isDemo ? demo!.nodes : (data?.nodes ?? [])
  const edges = isDemo ? demo!.edges : (data?.edges ?? [])

  const totalDelegations = edges.reduce((s, e) => s + e.count, 0)
  const avgEdgeScore =
    edges.length > 0
      ? Math.round(
          (edges.reduce((s, e) => s + e.avgScore * e.count, 0) /
            totalDelegations) *
            10,
        ) / 10
      : 0

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Interaction Map</h1>
      <ThemedPageHeader kanji="連携図" title="INTERACTION MAP" />

      <div className="grid grid-cols-4 gap-3">
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Agents
          </p>
          <p className="text-2xl font-bold" style={{ color: accent }}>
            {nodes.length}
          </p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Delegations
          </p>
          <p className="text-2xl font-bold text-zinc-100">{totalDelegations}</p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Connections
          </p>
          <p className="text-2xl font-bold text-zinc-100">{edges.length}</p>
        </ThemedCard>
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Avg Score
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: avgEdgeScore >= 7 ? '#22c55e' : accent }}
          >
            {avgEdgeScore}
          </p>
        </ThemedCard>
      </div>

      <ThemedCard>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Agent Delegation Flow
          </p>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            {Object.entries(ROLE_COLORS).map(([role, color]) => (
              <span key={role} className="flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {role}
              </span>
            ))}
          </div>
        </div>
        {nodes.length > 0 ? (
          <InteractionGraph nodes={nodes} edges={edges} accent={accent} />
        ) : (
          <p className="text-zinc-500 text-sm text-center py-16">
            No interaction data yet.
          </p>
        )}
      </ThemedCard>

      {/* Edge details table */}
      {edges.length > 0 && (
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            Delegation Details
          </p>
          <div className="space-y-2">
            {edges
              .sort((a, b) => b.count - a.count)
              .map((edge) => (
                <div
                  key={`${edge.from}-${edge.to}`}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    style={{ color: ROLE_COLORS[edge.from] }}
                    className="font-medium w-20"
                  >
                    {edge.from}
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span
                    style={{ color: ROLE_COLORS[edge.to] }}
                    className="font-medium w-20"
                  >
                    {edge.to}
                  </span>
                  <span className="text-zinc-400 font-mono text-xs">
                    {edge.count}x
                  </span>
                  <span className="text-zinc-500 font-mono text-xs">
                    avg {edge.avgScore}/10
                  </span>
                  <span className="text-zinc-600 text-xs truncate">
                    {edge.tasks.join(', ')}
                  </span>
                </div>
              ))}
          </div>
        </ThemedCard>
      )}
    </div>
  )
}
