import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface Notification {
  id: string
  level: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  source: string
}

const LEVEL_COLORS: Record<string, string> = {
  info: '#71717a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function NotificationBell({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState(
    () => localStorage.getItem('tenshu-notif-seen') || '',
  )
  const ref = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const { data } = useQuery<{ notifications: Notification[]; total: number }>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications?limit=30').then((r) => r.json()),
    refetchInterval: 10000,
  })

  const notifications = data?.notifications ?? []
  const unread = lastSeen
    ? notifications.filter(
        (n) => new Date(n.timestamp).getTime() > new Date(lastSeen).getTime(),
      ).length
    : notifications.length

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleOpen() {
    setOpen(!open)
    if (!open && notifications.length > 0) {
      const latest = notifications[0].timestamp
      setLastSeen(latest)
      localStorage.setItem('tenshu-notif-seen', latest)
    }
  }

  const bgColor =
    theme === 'warroom'
      ? 'rgba(46, 38, 28, 0.95)'
      : theme === 'deck'
        ? 'rgba(12, 12, 46, 0.95)'
        : 'rgba(60, 35, 50, 0.95)'
  const borderColor =
    theme === 'warroom'
      ? 'rgba(180, 140, 80, 0.2)'
      : theme === 'deck'
        ? 'rgba(6, 182, 212, 0.2)'
        : 'rgba(244, 114, 182, 0.2)'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-md transition-colors hover:bg-white/5 relative"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : 'Notifications, no unread'
        }
        aria-expanded={open}
      >
        <Bell
          className="w-3.5 h-3.5"
          style={{ color: unread > 0 ? accent : '#52525b' }}
        />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: '#ef4444' }}
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-72 rounded-lg shadow-2xl overflow-hidden z-50"
          style={{ background: bgColor, border: `1px solid ${borderColor}` }}
        >
          <div className="p-2 border-b" style={{ borderColor }}>
            <p className="text-xs font-medium" style={{ color: accent }}>
              Notifications ({notifications.length})
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-zinc-500 p-3 text-center">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="px-3 py-2 border-b hover:bg-white/3 transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: LEVEL_COLORS[n.level] }}
                    />
                    <span className="text-xs font-medium text-zinc-200">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-zinc-600 ml-auto">
                      {timeAgo(n.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 pl-3.5">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
