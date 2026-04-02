# Tenshu API Reference

Tenshu exposes a REST API and a WebSocket endpoint from its [Hono](https://hono.dev/) server. The default base URL is `http://localhost:3001`.

All endpoints return JSON. There is **no authentication** — the server is designed for local/trusted-network use.

---

## Table of Contents

- [Health Check](#health-check)
- [Agents](#agents)
- [Sessions](#sessions)
- [Activity](#activity)
- [Avatars](#avatars)
- [Cron](#cron)
- [Results](#results)
- [Knowledge](#knowledge)
- [Interactions](#interactions)
- [Notifications](#notifications)
- [System](#system)
- [WebSocket](#websocket)
- [Error Handling](#error-handling)
- [Authentication](#authentication)

---

## Health Check

### `GET /api/health`

Returns server status and whether demo mode is active.

**Response**

```jsonc
{
  "status": "ok",
  "name": "tenshu",
  "version": "0.1.0",
  "demo": false,
  "directoryWarnings": 0,
}
```

---

## Agents

### `GET /api/agents`

Returns all configured agents with their runtime state, color, and emoji.

**Response:** `Agent[]`

Each `Agent` combines static config with live state:

```ts
interface Agent {
  config: AgentConfig
  state: AgentState
  color: string
  emoji: string
}

interface AgentConfig {
  id: string
  name: string
  workspace: string
  default?: boolean
  model?: { primary: string; fallbacks?: string[] }
}

type AgentStatus = 'idle' | 'working' | 'thinking' | 'error' | 'offline'

interface AgentState {
  id: string
  status: AgentStatus
  currentTask?: string
  error?: string
  model?: string
  sessionId?: string
  lastActivity?: string // ISO 8601
}
```

**Example response:**

```json
[
  {
    "config": {
      "id": "researcher",
      "name": "Senku",
      "workspace": "/home/user/clawd/team/researcher",
      "model": { "primary": "claude-sonnet-4-20250514" }
    },
    "state": {
      "id": "researcher",
      "status": "working",
      "currentTask": "investigate-caching",
      "model": "claude-sonnet-4-20250514",
      "sessionId": "sess_abc123",
      "lastActivity": "2026-03-15T10:30:00.000Z"
    },
    "color": "#ff6b35",
    "emoji": "\ud83e\udd16"
  }
]
```

---

## Sessions

### `GET /api/sessions`

Returns active Claude Code sessions with token counts, model, and cost.

**Response:** `Session[]`

```ts
interface Session {
  id: string
  agentId: string
  label?: string
  startedAt: string // ISO 8601
  lastActivity: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
  cost: number
}
```

**Example response:**

```json
[
  {
    "id": "sess_abc123",
    "agentId": "coder",
    "startedAt": "2026-03-15T09:00:00.000Z",
    "lastActivity": "2026-03-15T10:45:00.000Z",
    "inputTokens": 125000,
    "outputTokens": 48000,
    "totalTokens": 173000,
    "model": "claude-sonnet-4-20250514",
    "cost": 1.23
  }
]
```

---

## Activity

All activity routes are mounted under `/api/activity`.

### `GET /api/activity/log`

Returns recent entries from the team log (`team-log.jsonl`).

**Query parameters:**

| Parameter | Type   | Default | Description               |
| --------- | ------ | ------- | ------------------------- |
| `limit`   | number | `20`    | Maximum entries to return |

**Response:** `LogEntry[]`

```ts
interface LogEntry {
  timestamp: string
  type: string
  agent: string
  task: string
  result_length: number
  score: number
  verdict: string
}
```

**Example response:**

```json
[
  {
    "timestamp": "2026-03-15T10:30:00.000Z",
    "type": "result",
    "agent": "coder",
    "task": "implement-caching",
    "result_length": 4500,
    "score": 8,
    "verdict": "keep"
  }
]
```

---

### `GET /api/activity/artifacts`

Returns recent research artifacts with previews.

**Query parameters:**

| Parameter | Type   | Default | Description                 |
| --------- | ------ | ------- | --------------------------- |
| `limit`   | number | `10`    | Maximum artifacts to return |

**Response:** `ArtifactSummary[]`

```ts
interface ArtifactSummary {
  name: string
  type: 'research' | 'coder' | 'qa'
  task: string
  timestamp: string
  sizeKB: number
  preview: string
}
```

**Example response:**

```json
[
  {
    "name": "research-caching-strategies-20260315-103000.md",
    "type": "research",
    "task": "caching-strategies",
    "timestamp": "2026-03-15 10:30:00",
    "sizeKB": 12,
    "preview": "Redis and in-memory caching both show significant improvements for read-heavy workloads..."
  }
]
```

---

### `GET /api/activity/current`

Returns current orchestrator cycle status by reading the tail of the orchestrator output log.

**Response:**

```ts
// When orchestrator is not running:
{ running: false, lines: [] }

// When orchestrator is running:
{
  running: true,
  cycle: string,
  task: string,
  lastAgent: string,
  lastStatus: string,
  recentLines: string[]  // last 15 lines of output
}
```

**Example response:**

```json
{
  "running": true,
  "cycle": "42",
  "task": "implement-caching",
  "lastAgent": "coder",
  "lastStatus": "coder responded (3200 chars)",
  "recentLines": [
    "CYCLE 42 (#42) \u2014 implement-caching",
    "Sending to researcher (researcher)",
    "researcher responded (2100 chars)",
    "Sending to coder (coder)",
    "coder responded (3200 chars)"
  ]
}
```

---

### `GET /api/activity/agent-history`

Returns per-agent task history grouped by role (researcher, coder, qa, planner).

**Query parameters:**

| Parameter | Type   | Default | Description                |
| --------- | ------ | ------- | -------------------------- |
| `limit`   | number | `10`    | Max entries per agent role |

**Response:** `Record<string, HistoryEntry[]>`

Keys are agent roles: `researcher`, `coder`, `qa`, `planner`.

```ts
interface HistoryEntry {
  cycle: number
  task: string
  score: number
  status: string
  description: string
  timestamp: string
  detailedTask: string
  verdict: string
  resultLength: number
}
```

**Example response:**

```json
{
  "researcher": [
    {
      "cycle": 42,
      "task": "implement-caching",
      "score": 8,
      "status": "keep",
      "description": "Researched: implement caching",
      "timestamp": "2026-03-15T10:30:00.000Z",
      "detailedTask": "Redis and in-memory caching both show significant improvements...",
      "verdict": "",
      "resultLength": 0
    }
  ],
  "coder": [],
  "qa": [],
  "planner": []
}
```

---

## Avatars

All avatar routes are mounted under `/api/avatars`.

### `GET /api/avatars`

Returns the current avatar configuration mapping agent IDs to image paths.

**Response:** `Record<string, string>`

```json
{
  "researcher": "/assets/characters/char-01.png",
  "coder": "/assets/characters/custom/coder_1710500000.png"
}
```

---

### `GET /api/avatars/available`

Lists all available character images (built-in and custom uploads).

**Response:** `string[]`

```json
[
  "/assets/characters/char-01.png",
  "/assets/characters/char-02.png",
  "/assets/characters/custom/coder_1710500000.png"
]
```

---

### `PUT /api/avatars/:agentId`

Sets the avatar image for an agent.

**Request body:**

```json
{ "image": "/assets/characters/char-03.png" }
```

**Response:**

```json
{
  "ok": true,
  "agentId": "researcher",
  "image": "/assets/characters/char-03.png"
}
```

**Errors:**

| Status | Condition          |
| ------ | ------------------ |
| 400    | `image` is missing |

---

### `POST /api/avatars/:agentId/upload`

Uploads a custom avatar image for an agent. Accepts multipart form data with a `file` field.

**Request:** `multipart/form-data` with field `file` (image file)

**Response:**

```json
{
  "ok": true,
  "agentId": "coder",
  "image": "/assets/characters/custom/coder_1710500000.png"
}
```

**Errors:**

| Status | Condition         |
| ------ | ----------------- |
| 400    | `file` is missing |

---

## Cron

All cron routes are mounted under `/api/cron`.

### `GET /api/cron`

Lists all scheduled cron jobs.

**Response:** `CronJob[]`

```ts
interface CronJob {
  id: string
  name: string
  schedule: string // cron expression
  enabled: boolean
  lastRun?: string // ISO 8601
  nextRun?: string // ISO 8601
  lastStatus?: 'success' | 'error'
}
```

**Example response:**

```json
[
  {
    "id": "nightly-research",
    "name": "Nightly Research Cycle",
    "schedule": "0 2 * * *",
    "enabled": true,
    "lastRun": "2026-03-15T02:00:00.000Z",
    "nextRun": "2026-03-16T02:00:00.000Z",
    "lastStatus": "success"
  }
]
```

---

### `PUT /api/cron/:id`

Toggles a cron job enabled/disabled.

**Request body:**

```json
{ "enabled": true }
```

**Response:**

```json
{ "ok": true }
```

**Errors:**

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| 400    | Invalid job ID or `enabled` is not a boolean |

---

### `POST /api/cron/:id/run`

Manually triggers a cron job.

**Response:**

```json
{ "ok": true }
```

**Errors:**

| Status | Condition      |
| ------ | -------------- |
| 400    | Invalid job ID |

---

### `GET /api/cron/:id/runs`

Returns execution history for a specific cron job.

**Response:** `CronRun[]`

```ts
interface CronRun {
  id: string
  jobId: string
  startedAt: string // ISO 8601
  finishedAt?: string
  status: 'running' | 'success' | 'error'
  output?: string
}
```

**Example response:**

```json
[
  {
    "id": "run-001",
    "jobId": "nightly-research",
    "startedAt": "2026-03-15T02:00:00.000Z",
    "finishedAt": "2026-03-15T02:45:00.000Z",
    "status": "success",
    "output": "Completed 3 research cycles"
  }
]
```

---

## Results

### `GET /api/results`

Returns all experiment results from the `results.tsv` log file.

**Response:** `ResultRow[]`

```ts
interface ResultRow {
  timestamp: string // ISO 8601
  cycle: number
  task: string
  agent: string
  score: number
  status: 'keep' | 'discard' | 'crash' | 'skip'
  description: string
}
```

**Example response:**

```json
[
  {
    "timestamp": "2026-03-15T10:30:00.000Z",
    "cycle": 42,
    "task": "implement-caching",
    "agent": "coder",
    "score": 8,
    "status": "keep",
    "description": "Implemented Redis caching layer with TTL support"
  }
]
```

---

## Knowledge

All knowledge routes are mounted under `/api/knowledge`.

### `GET /api/knowledge`

Lists and searches knowledge artifacts with filtering.

**Query parameters:**

| Parameter | Type   | Default | Description                                              |
| --------- | ------ | ------- | -------------------------------------------------------- |
| `limit`   | number | `50`    | Maximum artifacts to return                              |
| `search`  | string | `""`    | Full-text search across filenames and content            |
| `agent`   | string | `""`    | Filter by agent type (`research`, `coder`, `qa`) or name |
| `type`    | string | `""`    | Filter by artifact type (`research`, `coder`, `qa`)      |

**Response:**

```ts
{
  artifacts: KnowledgeArtifact[],
  total: number
}

interface KnowledgeArtifact {
  name: string
  path: string
  type: 'research' | 'coder' | 'qa' | 'misc'
  task: string
  agent: string
  timestamp: string
  sizeKB: number
  preview: string
}
```

**Example response:**

```json
{
  "artifacts": [
    {
      "name": "research-caching-strategies-20260315-103000.md",
      "path": "/home/user/clawd/team/knowledge/artifacts/research-caching-strategies-20260315-103000.md",
      "type": "research",
      "task": "caching-strategies",
      "agent": "Senku",
      "timestamp": "2026-03-15 10:30:00",
      "sizeKB": 12,
      "preview": "Redis and in-memory caching both show significant improvements..."
    }
  ],
  "total": 1
}
```

---

### `GET /api/knowledge/artifact/:name`

Returns the full content of a single knowledge artifact.

**Path parameters:**

| Parameter | Description                                   |
| --------- | --------------------------------------------- |
| `name`    | Artifact filename (no path traversal allowed) |

**Response:**

```json
{
  "name": "research-caching-strategies-20260315-103000.md",
  "content": "# Caching Strategies Research\n\n...",
  "type": "research",
  "task": "caching-strategies",
  "agent": "Senku",
  "timestamp": "2026-03-15 10:30:00",
  "sizeKB": 12
}
```

**Errors:**

| Status | Condition                     |
| ------ | ----------------------------- |
| 400    | Filename contains `..` or `/` |
| 404    | Artifact not found            |

---

### `GET /api/knowledge/stats`

Returns aggregate statistics about the knowledge base.

**Response:**

```json
{
  "total": 150,
  "totalSizeKB": 1840,
  "byType": { "research": 80, "coder": 50, "qa": 20 },
  "byAgent": { "Senku": 80, "Bulma": 50, "Vegeta": 20 }
}
```

---

## Interactions

### `GET /api/interactions`

Returns the agent interaction graph — nodes (agents) and edges (delegation flow) derived from experiment results.

**Response:**

```ts
{
  nodes: AgentNode[],
  edges: DelegationEdge[]
}

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
  tasks: string[]   // up to 5 recent task names
}
```

**Example response:**

```json
{
  "nodes": [
    {
      "id": "researcher",
      "name": "Senku",
      "role": "researcher",
      "tasksCompleted": 42,
      "avgScore": 7.5
    },
    {
      "id": "coder",
      "name": "Bulma",
      "role": "coder",
      "tasksCompleted": 40,
      "avgScore": 7.8
    },
    {
      "id": "qa",
      "name": "Vegeta",
      "role": "qa",
      "tasksCompleted": 38,
      "avgScore": 7.2
    }
  ],
  "edges": [
    {
      "from": "researcher",
      "to": "coder",
      "count": 40,
      "avgScore": 7.6,
      "tasks": ["implement-caching", "add-auth"]
    },
    {
      "from": "coder",
      "to": "qa",
      "count": 38,
      "avgScore": 7.4,
      "tasks": ["implement-caching", "add-auth"]
    }
  ]
}
```

---

## Notifications

All notification routes are mounted under `/api/notifications`.

Notifications are stored in-memory and reset on server restart. The server auto-scans for events every 15 seconds (high scores, crashes, low scores, timeouts, orchestrator errors).

### `GET /api/notifications`

Returns recent notifications.

**Query parameters:**

| Parameter | Type   | Default | Description                                    |
| --------- | ------ | ------- | ---------------------------------------------- |
| `limit`   | number | `50`    | Maximum notifications to return                |
| `since`   | string | `""`    | ISO 8601 timestamp — only return newer entries |

**Response:**

```ts
{
  notifications: Notification[],
  total: number
}

interface Notification {
  id: string
  level: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string   // ISO 8601
  source: string      // 'results' | 'orchestrator'
}
```

**Example response:**

```json
{
  "notifications": [
    {
      "id": "1710500000000-a1b2",
      "level": "success",
      "title": "High Score!",
      "message": "Cycle #42: 9/10 on implement-caching",
      "timestamp": "2026-03-15T10:30:00.000Z",
      "source": "results"
    }
  ],
  "total": 1
}
```

---

### `DELETE /api/notifications/:id`

Dismisses a single notification.

**Response:**

```json
{ "ok": true }
```

---

## System

### `GET /api/system`

Returns live system resource metrics (GPU, CPU, memory, disk, loaded Ollama models, uptime).

**Response:** `SystemResources`

```ts
interface SystemResources {
  gpu: {
    name: string
    tempC: number
    utilPercent: number
    memUsedMB: number
    memTotalMB: number
    powerW: number
    powerCapW: number
  } | null
  cpu: {
    usagePercent: number
    cores: number
  }
  memory: {
    usedMB: number
    totalMB: number
  }
  disk: {
    usedGB: number
    totalGB: number
    path: string
  }
  loadedModels: Array<{
    name: string
    sizeGB: number
  }>
  uptime: string
}
```

**Example response:**

```json
{
  "gpu": {
    "name": "NVIDIA RTX 4090",
    "tempC": 65,
    "utilPercent": 82,
    "memUsedMB": 18432,
    "memTotalMB": 24576,
    "powerW": 320,
    "powerCapW": 450
  },
  "cpu": { "usagePercent": 34, "cores": 16 },
  "memory": { "usedMB": 24576, "totalMB": 65536 },
  "disk": { "usedGB": 450, "totalGB": 1000, "path": "/" },
  "loadedModels": [{ "name": "llama3:70b", "sizeGB": 38.5 }],
  "uptime": "5d 12h 30m"
}
```

GPU is `null` when `nvidia-smi` is unavailable.

---

## WebSocket

### `ws://localhost:3001/ws`

Bidirectional WebSocket for real-time updates. The server pushes events; clients do not need to send messages.

**Connection:** On connect, the server sends a `connected` message with the current client count.

### Message Format

All messages use the `WSMessage<T>` envelope:

```ts
type WSMessageType =
  | 'agent:status'
  | 'agent:activity'
  | 'session:update'
  | 'cron:run'
  | 'connected'

interface WSMessage<T = unknown> {
  type: WSMessageType
  payload: T
  timestamp: string // ISO 8601
}
```

### Event Types

#### `connected`

Sent immediately on connection.

```json
{
  "type": "connected",
  "payload": { "clientCount": 3 },
  "timestamp": "2026-03-15T10:30:00.000Z"
}
```

#### `agent:status`

Broadcast when an agent's status or current task changes (polled every 5 seconds). Also sent when an agent goes offline.

```json
{
  "type": "agent:status",
  "payload": {
    "id": "coder",
    "status": "working",
    "currentTask": "implement-caching",
    "model": "claude-sonnet-4-20250514",
    "sessionId": "sess_abc123",
    "lastActivity": "2026-03-15T10:30:00.000Z"
  },
  "timestamp": "2026-03-15T10:30:05.000Z"
}
```

Offline event:

```json
{
  "type": "agent:status",
  "payload": { "id": "coder", "status": "offline" },
  "timestamp": "2026-03-15T10:30:10.000Z"
}
```

#### `agent:activity`

Broadcast when a file is created or changed in an agent's workspace (via chokidar file watchers).

```json
{
  "type": "agent:activity",
  "payload": {
    "agentId": "coder",
    "event": "file_changed",
    "path": "/home/user/clawd/team/coder/src/cache.ts",
    "timestamp": "2026-03-15T10:31:00.000Z"
  },
  "timestamp": "2026-03-15T10:31:00.000Z"
}
```

`event` is either `"file_changed"` or `"file_created"`.

#### `session:update`

Broadcast when session data changes (token counts, activity).

#### `cron:run`

Broadcast when a cron job starts or completes.

---

## Error Handling

All endpoints follow a consistent error pattern. On failure, the server returns an appropriate HTTP status code with a JSON error body:

```json
{ "error": "Description of what went wrong" }
```

Common status codes:

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| 200    | Success                                          |
| 400    | Bad request (invalid parameters, missing fields) |
| 404    | Resource not found                               |
| 500    | Internal server error                            |

When data sources are unavailable (files don't exist, services not running), endpoints return empty arrays `[]` or empty objects `{}` rather than errors — the server gracefully degrades.

---

## Authentication

Tenshu does **not** implement authentication. It is designed for local development use or trusted networks. If you need to expose Tenshu externally, place it behind a reverse proxy with authentication (e.g., nginx with basic auth, or an OAuth proxy).
