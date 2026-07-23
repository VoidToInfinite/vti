import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { Hero } from '@/components/sections/Hero/Hero'

describe('Hero', () => {
  it('muestra la marca VoidToInfinite', () => {
    renderWithProviders(<Hero />)
    expect(screen.getByText(/VoidToInfinite/i)).toBeInTheDocument()
  })
})
