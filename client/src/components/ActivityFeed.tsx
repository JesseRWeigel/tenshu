import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ActivityItem {
  id: string
  text: string
  timestamp: string
  type: 'activity' | 'status'
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const { subscribe } = useWebSocket()

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'agent:activity' || msg.type === 'agent:status') {
        const payload = msg.payload as Record<string, unknown>
        const text =
          msg.type === 'agent:activity'
            ? `${payload.agentId}: ${payload.event} — ${(payload.path as string)?.split('/').pop() || ''}`
            : `${payload.id}: status → ${payload.status}`

        setItems((prev) => {
          const next = [
            {
              id: `${Date.now()}-${Math.random()}`,
              text,
              timestamp: msg.timestamp,
              type:
                msg.type === 'agent:activity'
                  ? ('activity' as const)
                  : ('status' as const),
            },
            ...prev,
          ]
          return next.slice(0, 50)
        })
      }
    })
  }, [subscribe])

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '--:--'
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full">
      <h3 className="text-sm font-medium text-zinc-400 mb-3">Live Activity</h3>
      <ScrollArea className="h-[calc(100%-2rem)]">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-600">Waiting for activity...</p>
        ) : (
          <div className="space-y-2" aria-live="polite">
            {items.map((item) => (
              <div key={item.id} className="text-sm">
                <span className="text-emerald-500">
                  {formatTime(item.timestamp)}
                </span>{' '}
                <span className="text-zinc-300">{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
