import { useMemo } from 'react'
import { planBlocks } from '../lib/calc.js'

/**
 * Auto-Rebalance-Hook: rechnet die Ziele der verbleibenden Blöcke neu, sobald ein Block
 * als verpasst/erledigt markiert oder der Wasser-Joker umgelegt wird.
 *
 * daily = { missed:boolean[], done:boolean[], joker:boolean, … }
 */
export function useAutoRebalance(daily) {
  return useMemo(
    () => planBlocks({ missed: daily.missed, done: daily.done, joker: daily.joker }),
    [daily.missed, daily.done, daily.joker],
  )
}
