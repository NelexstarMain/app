export type CommandPrefix = '#' | '/' | '>'

export interface CommandFlags {
  priority?: 'p1' | 'p2' | 'p3'
  timeEstimateMin?: number
  targetCanvas?: string
  targetFolder?: string
  depth?: number
  format?: 'pdf' | 'png' | 'md'
  isolated?: boolean
  typeFilter?: 'img' | 'note' | 'all'
  due?: string
  autoLink?: boolean
  limit?: number
  template?: 'blank' | 'mindmap'
}

export interface ParsedCommand {
  rawInput: string
  prefix: CommandPrefix
  command: string
  primaryArgument: string | null
  secondaryArgument: string | null
  flags: CommandFlags
}

export function parseCliCommand(raw: string): ParsedCommand | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const firstChar = trimmed[0]
  if (firstChar !== '#' && firstChar !== '/' && firstChar !== '>') {
    return null
  }

  const prefix = firstChar as CommandPrefix
  const rest = trimmed.slice(1).trim()
  const parts = rest.split(/\s+/)
  const command = parts[0]?.toLowerCase() || ''
  const argTokens = parts.slice(1)

  const flags: CommandFlags = {}
  const textArgs: string[] = []

  for (const token of argTokens) {
    if (token.startsWith('!')) {
      const p = token.slice(1).toLowerCase()
      if (p === 'p1' || p === 'p2' || p === 'p3') flags.priority = p
    } else if (token.startsWith('~')) {
      const timeStr = token.slice(1).replace(/m$/i, '')
      const num = parseInt(timeStr, 10)
      if (!isNaN(num)) flags.timeEstimateMin = num
    } else if (token.startsWith('--')) {
      const [key, val] = token.slice(2).split(':')
      if (key === 'canvas') flags.targetCanvas = val
      if (key === 'folder') flags.targetFolder = val
      if (key === 'depth') flags.depth = parseInt(val, 10)
      if (key === 'format' && (val === 'pdf' || val === 'png' || val === 'md')) flags.format = val
      if (key === 'type' && (val === 'img' || val === 'note' || val === 'all')) flags.typeFilter = val
      if (key === 'due') flags.due = val
      if (key === 'limit') flags.limit = parseInt(val, 10)
      if (key === 'template' && (val === 'blank' || val === 'mindmap')) flags.template = val
      if (key === 'isolate' || key === 'isolated') flags.isolated = true
      if (key === 'auto-link') flags.autoLink = true
    } else {
      textArgs.push(token)
    }
  }

  const joinedText = textArgs.join(' ')
  let primaryArgument: string | null = null
  let secondaryArgument: string | null = null

  if (joinedText.includes('|')) {
    const pipeParts = joinedText.split('|').map((s) => s.trim())
    primaryArgument = pipeParts[0] || null
    secondaryArgument = pipeParts[1] || null
  } else {
    primaryArgument = joinedText || null
  }

  return {
    rawInput: raw,
    prefix,
    command,
    primaryArgument,
    secondaryArgument,
    flags
  }
}
