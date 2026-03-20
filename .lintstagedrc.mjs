import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  '*.{js,jsx,ts,tsx,json,css,md,html,yaml,yml}': 'prettier --write',
  '*.{ts,tsx}': (files) => {
    // Group files by workspace so eslint uses the correct config
    const groups = { client: [], server: [], shared: [] }
    for (const file of files) {
      const rel = path.relative(__dirname, file)
      for (const ws of ['client', 'server', 'shared']) {
        if (rel.startsWith(`${ws}/`) || rel.startsWith(`${ws}\\`)) {
          groups[ws].push(file)
          break
        }
      }
    }
    const cmds = []
    for (const [ws, wsFiles] of Object.entries(groups)) {
      if (wsFiles.length > 0) {
        const configPath = path.join(__dirname, ws, 'eslint.config.js')
        cmds.push(
          `eslint --no-warn-ignored --max-warnings 0 --config ${configPath} ${wsFiles.map((f) => `"${f}"`).join(' ')}`,
        )
      }
    }
    return cmds
  },
}
