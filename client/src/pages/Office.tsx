import { useState, useMemo } from 'react'
import type { Agent } from '@tenshu/shared'
import { useAgents } from '@/hooks/useAgents'
import { useTheme } from '@/hooks/useTheme'
import { useSoundOnStatusChange } from '@/hooks/useSound'
import { WarRoom } from '@/office2d/WarRoom'
import { ControlDeck } from '@/office2d/ControlDeck'
import { GardenView } from '@/office2d/GardenView'
import AgentPanel from '@/office2d/AgentPanel'

export function Office() {
  const { agents, loading } = useAgents()
  const { theme } = useTheme()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const agentStatuses = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of agents) map[a.config.id] = a.state?.status ?? 'offline'
    return map
  }, [agents])
  useSoundOnStatusChange(agentStatuses)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="relative w-full h-full -m-6">
      <h1 className="sr-only">Command Center</h1>
      {theme === 'warroom' ? (
        <WarRoom
          agents={agents}
          onSelectAgent={setSelectedAgent}
          selectedAgentId={selectedAgent?.config.id ?? null}
        />
      ) : theme === 'deck' ? (
        <ControlDeck
          agents={agents}
          onSelectAgent={setSelectedAgent}
          selectedAgentId={selectedAgent?.config.id ?? null}
        />
      ) : (
        <GardenView
          agents={agents}
          onSelectAgent={setSelectedAgent}
          selectedAgentId={selectedAgent?.config.id ?? null}
        />
      )}

      {selectedAgent && (
        <AgentPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}
