import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Deterministic ACI Tool 1: list_files
 * Scans workspace directory excluding node_modules, .git, .next
 */
export function list_files(directoryPath: string): string[] {
  try {
    if (!fs.existsSync(directoryPath)) return []

    const ignoreDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.idea', '.vscode'])
    const filesList: string[] = []

    function walk(currentPath: string) {
      const items = fs.readdirSync(currentPath, { withFileTypes: true })
      for (const item of items) {
        if (ignoreDirs.has(item.name)) continue

        const fullPath = path.join(currentPath, item.name)
        const relPath = path.relative(directoryPath, fullPath)

        if (item.isDirectory()) {
          walk(fullPath)
        } else {
          filesList.push(relPath)
        }
      }
    }

    walk(directoryPath)
    return filesList
  } catch (err: unknown) {
    return [ `Error listing files: ${err instanceof Error ? err.message : String(err)}` ]
  }
}

/**
 * Deterministic ACI Tool 2: read_file
 * Reads line-numbered text content of a target file
 */
export function read_file(directoryPath: string, filePath: string): string {
  try {
    const targetPath = path.join(directoryPath, filePath)
    if (!fs.existsSync(targetPath)) {
      return `File not found: ${filePath}`
    }

    const content = fs.readFileSync(targetPath, 'utf-8')
    const lines = content.split('\n')
    return lines.map((line, idx) => `${idx + 1}: ${line}`).join('\n')
  } catch (err: unknown) {
    return `Error reading file ${filePath}: ${err instanceof Error ? err.message : String(err)}`
  }
}

/**
 * Deterministic ACI Tool 3: edit_file
 * Writes or replaces clean file content
 */
export function edit_file(directoryPath: string, filePath: string, newContent: string): string {
  try {
    const targetPath = path.join(directoryPath, filePath)
    const dir = path.dirname(targetPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(targetPath, newContent, 'utf-8')
    return `Successfully updated ${filePath}`
  } catch (err: unknown) {
    return `Error editing file ${filePath}: ${err instanceof Error ? err.message : String(err)}`
  }
}

/**
 * Deterministic ACI Tool 4: run_syntax_check
 * Runs local compiler/type check (npx tsc --noEmit or npm run build).
 * Repos without a tsconfig are skipped (nothing meaningful to check).
 */
export function run_syntax_check(directoryPath: string): { success: boolean; output: string } {
  try {
    if (!fs.existsSync(path.join(directoryPath, 'tsconfig.json'))) {
      return { success: true, output: 'No tsconfig.json found — syntax check skipped for this repository.' }
    }

    // `-p typescript` is required: bare `npx tsc` resolves to the deprecated
    // placeholder package when the sandbox has no local TypeScript install.
    const output = execSync('npx --yes -p typescript tsc --noEmit', {
      cwd: directoryPath,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: 'pipe',
    })
    return { success: true, output: output || 'Syntax check passed with zero errors.' }
  } catch (err: unknown) {
    const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string }
    const stderr = e.stderr ? e.stderr.toString() : ''
    const stdout = e.stdout ? e.stdout.toString() : ''
    return {
      success: false,
      output: stderr || stdout || e.message || 'Syntax validation failed.',
    }
  }
}
