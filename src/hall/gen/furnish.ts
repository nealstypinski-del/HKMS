import type { FurnResult } from './builder'
import { furnishOffice } from './furnish.office'
import { furnishAgentLounge, furnishCafe, furnishCanteen, furnishGym, furnishLibrary, furnishLobby, furnishPost, furnishWellness } from './furnish.public'
import { furnishBoardroom, furnishConference, furnishMeeting, furnishPhone, furnishPodcast, furnishStudio, furnishTraining } from './furnish.meeting'
import { furnishArchive, furnishDevLounge, furnishServer, furnishTech } from './furnish.tech'
import { ROOMS } from '../plan/hall.plan'
import type { DeskSpot, FurnItem, RoomDef, Slot } from '../plan/hall.types'

export function furnishRoom(room: RoomDef): FurnResult {
  switch (room.type) {
    case 'office': return furnishOffice(room, room.id === 'qa' ? 1 : 2)
    case 'lobby': return furnishLobby(room)
    case 'cafe': return furnishCafe(room)
    case 'canteen': return furnishCanteen(room)
    case 'library': return furnishLibrary(room)
    case 'lounge': return furnishAgentLounge(room)
    case 'post': return furnishPost(room)
    case 'gym': return furnishGym(room)
    case 'wellness': return furnishWellness(room)
    case 'tech': return furnishTech(room)
    case 'server': return furnishServer(room)
    case 'meeting': return furnishMeeting(room)
    case 'boardroom': return furnishBoardroom(room)
    case 'conference': return furnishConference(room)
    case 'training': return furnishTraining(room)
    case 'phone': return furnishPhone(room)
    case 'archive': return furnishArchive(room)
    case 'studio': return furnishStudio(room)
    case 'podcast': return furnishPodcast(room)
    case 'devlounge': return furnishDevLounge(room)
  }
}

export interface Furnished {
  items: FurnItem[]
  slots: Slot[]
  desks: DeskSpot[]
}

function build(): Furnished {
  const out: Furnished = { items: [], slots: [], desks: [] }
  for (const room of ROOMS) {
    const r = furnishRoom(room)
    out.items.push(...r.items)
    out.slots.push(...r.slots)
    out.desks.push(...r.desks)
  }
  return out
}

/** Gesamte Einrichtung der Halle (einmal berechnet). */
export const FURNISHED: Furnished = build()
