import { MotionGlobalConfig } from 'motion/react'
import { describe, expect, it } from 'vitest'

describe('preparação dos testes para o Motion', () => {
  it('desliga as animações do Motion, para os testes afirmarem o estado final sem esperar', () => {
    expect(MotionGlobalConfig.skipAnimations).toBe(true)
  })
})
