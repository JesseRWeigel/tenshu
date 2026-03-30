import { useQuery } from '@tanstack/react-query'
import type { SystemResources } from '@tenshu/shared'
import { ThemedPageHeader } from '@/components/ThemedPageHeader'
import { ThemedCard } from '@/components/ThemedCard'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'

function UsageBar({
  used,
  total,
  unit,
  accent,
  warnAt = 80,
  dangerAt = 90,
}: {
  used: number
  total: number
  unit: string
  accent: string
  warnAt?: number
  dangerAt?: number
}) {
  const pct = total > 0 ? (used / total) * 100 : 0
  const barColor =
    pct >= dangerAt ? '#ef4444' : pct >= warnAt ? '#f59e0b' : accent
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>
          {used.toLocaleString()} / {total.toLocaleString()} {unit}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function TempDisplay({ tempC, accent }: { tempC: number; accent: string }) {
  const color = tempC >= 85 ? '#ef4444' : tempC >= 70 ? '#f59e0b' : accent
  return (
    <span className="text-3xl font-bold" style={{ color }}>
      {tempC}°C
    </span>
  )
}

export function System() {
  const { theme } = useTheme()
  const accent =
    theme === 'warroom' ? '#f59e0b' : theme === 'deck' ? '#06b6d4' : '#f472b6'

  const { data: sys, isLoading } = useQuery<SystemResources>({
    queryKey: ['system'],
    queryFn: () => fetch('/api/system').then((r) => r.json()),
    refetchInterval: 5000,
  })

  if (isLoading || !sys) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-400">Loading system info...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">System Instruments</h1>
      <div className="flex items-center justify-between">
        <ThemedPageHeader kanji="計器" title="INSTRUMENTS" />
        <Badge
          variant="outline"
          className="text-xs"
          style={{ borderColor: `${accent}44`, color: `${accent}99` }}
        >
          Uptime: {sys.uptime}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* GPU */}
        {sys.gpu && (
          <ThemedCard className="col-span-2" glow>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  GPU
                </p>
                <p className="text-sm text-zinc-300 mt-0.5">{sys.gpu.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <TempDisplay tempC={sys.gpu.tempC} accent={accent} />
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Power</p>
                  <p className="text-sm font-mono">
                    {sys.gpu.powerW}W / {sys.gpu.powerCapW}W
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Utilization</p>
                <UsageBar
                  used={sys.gpu.utilPercent}
                  total={100}
                  unit="%"
                  accent={accent}
                />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">VRAM</p>
                <UsageBar
                  used={sys.gpu.memUsedMB}
                  total={sys.gpu.memTotalMB}
                  unit="MB"
                  accent={accent}
                />
              </div>
            </div>
          </ThemedCard>
        )}

        {/* CPU */}
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">CPU</p>
          <p className="text-sm text-zinc-400 mt-0.5 mb-3">
            {sys.cpu.cores} cores
          </p>
          <UsageBar
            used={sys.cpu.usagePercent}
            total={100}
            unit="%"
            accent={accent}
          />
        </ThemedCard>

        {/* Memory */}
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Memory
          </p>
          <p className="text-sm text-zinc-400 mt-0.5 mb-3">System RAM</p>
          <UsageBar
            used={sys.memory.usedMB}
            total={sys.memory.totalMB}
            unit="MB"
            accent={accent}
          />
        </ThemedCard>

        {/* Disk */}
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Disk ({sys.disk.path})
          </p>
          <div className="mt-3">
            <UsageBar
              used={sys.disk.usedGB}
              total={sys.disk.totalGB}
              unit="GB"
              accent={accent}
            />
          </div>
        </ThemedCard>

        {/* Loaded Models */}
        <ThemedCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Loaded Models
          </p>
          <div className="mt-3 space-y-2">
            {sys.loadedModels.length === 0 ? (
              <p className="text-sm text-zinc-500">No models loaded</p>
            ) : (
              sys.loadedModels.map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300 font-mono">
                    {m.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: `${accent}44`, color: accent }}
                  >
                    {m.sizeGB}GB
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ThemedCard>
      </div>
    </div>
  )
}
