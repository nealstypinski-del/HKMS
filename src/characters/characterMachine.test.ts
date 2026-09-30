import { describe, expect, it } from 'vitest'
import { transition } from './characterMachine'

describe('characterMachine', () => {
  it('führt den Standardablauf Idle, Desk, Working, Waiting, Working, Idle aus', () => {
    let p = transition('IDLE', { type: 'STATUS', status: 'working' })
    expect(p).toBe('WALKING_TO_DESK')
    p = transition(p, { type: 'ARRIVED', status: 'working' })
    expect(p).toBe('WORKING')
    p = transition(p, { type: 'STATUS', status: 'waiting' })
    expect(p).toBe('WAITING')
    p = transition(p, { type: 'STATUS', status: 'working' })
    expect(p).toBe('WORKING')
    p = transition(p, { type: 'STATUS', status: 'idle' })
    expect(p).toBe('WALKING_TO_IDLE')
    expect(transition(p, { type: 'ARRIVED', status: 'idle' })).toBe('IDLE')
  })

  it('wartet nach dem Laufen zum Platz, wenn der Status waiting ist', () => {
    const p = transition('IDLE', { type: 'STATUS', status: 'waiting' })
    expect(transition(p, { type: 'ARRIVED', status: 'waiting' })).toBe('WAITING')
  })

  it('unterstützt Pause, Meeting und Offline', () => {
    expect(transition('WORKING', { type: 'STATUS', status: 'break' })).toBe('WALKING_TO_BREAK')
    expect(transition('WALKING_TO_BREAK', { type: 'ARRIVED', status: 'break' })).toBe('ON_BREAK')
    expect(transition('IDLE', { type: 'STATUS', status: 'meeting' })).toBe('WALKING_TO_MEETING')
    expect(transition('IN_MEETING', { type: 'STATUS', status: 'offline' })).toBe('OFFLINE')
  })
})
