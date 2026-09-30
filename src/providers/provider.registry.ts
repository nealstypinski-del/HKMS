import { MockProvider } from './mock.provider'
import type { AIProvider } from './provider.types'

export const mockProvider = new MockProvider()

// Loop 2 registriert hier ClaudeCodeProvider und CodexProvider. Loop 1 kennt ausschließlich den Mock.
const registry = new Map<string, AIProvider>([[mockProvider.id, mockProvider]])

export const registerProvider = (provider: AIProvider): void => {
  registry.set(provider.id, provider)
}

/** Liefert den Provider. Nicht registrierte Ids (claude, codex, auto) fallen in Loop 1 ehrlich auf den Mock zurück. */
export const getProvider = (id: string): AIProvider => registry.get(id) ?? mockProvider

export const listProviders = (): AIProvider[] => [...registry.values()]
