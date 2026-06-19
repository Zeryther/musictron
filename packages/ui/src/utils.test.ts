import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn (ui)', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
  })

  it('resolves conflicting tailwind utilities', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
