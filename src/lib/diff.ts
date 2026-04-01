export interface DiffPart {
  type: 'same' | 'added' | 'removed'
  text: string
}

function tokenize(value: string): string[] {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.split(' ') : []
}

export function buildWordDiff(before: string, after: string): DiffPart[] {
  const beforeTokens = tokenize(before)
  const afterTokens = tokenize(after)

  if (!beforeTokens.length && !afterTokens.length) {
    return []
  }

  const matrix = Array.from({ length: beforeTokens.length + 1 }, () =>
    Array.from<number>({ length: afterTokens.length + 1 }).fill(0),
  )

  for (let i = beforeTokens.length - 1; i >= 0; i -= 1) {
    for (let j = afterTokens.length - 1; j >= 0; j -= 1) {
      if (beforeTokens[i] === afterTokens[j]) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1])
      }
    }
  }

  const parts: DiffPart[] = []
  let i = 0
  let j = 0

  const pushPart = (type: DiffPart['type'], token: string) => {
    const previous = parts[parts.length - 1]

    if (previous?.type === type) {
      previous.text = `${previous.text} ${token}`
      return
    }

    parts.push({ type, text: token })
  }

  while (i < beforeTokens.length && j < afterTokens.length) {
    if (beforeTokens[i] === afterTokens[j]) {
      pushPart('same', beforeTokens[i])
      i += 1
      j += 1
      continue
    }

    if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      pushPart('removed', beforeTokens[i])
      i += 1
    } else {
      pushPart('added', afterTokens[j])
      j += 1
    }
  }

  while (i < beforeTokens.length) {
    pushPart('removed', beforeTokens[i])
    i += 1
  }

  while (j < afterTokens.length) {
    pushPart('added', afterTokens[j])
    j += 1
  }

  return parts
}
