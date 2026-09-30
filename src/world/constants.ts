export const FLOOR_H = 5.2 // Abstand zwischen zwei Geschossen
export const SLAB_H = 0.4
export const ROOM_H = 4.8 // lichte Höhe
export const WALL_H = 3.0 // Glastrennwände
export const HALF_W = 22
export const HALF_D = 15
export const DOOR_W = 2.8
export const AGENT_RADIUS = 0.3
export const NAV_CELL = 0.25
export const TOWER_RADIUS_HINT = 26

/** Oberkante des begehbaren Bodens eines Geschosses. */
export const floorBaseY = (level: number) => level * FLOOR_H + SLAB_H
