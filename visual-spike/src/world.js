// Gemeinsame Maße der Welt. Das Haus steht im Ursprung, der Eingang liegt an der Vorderseite (+z).
export const FLOOR_H = 4.8 // Höhe einer Etage
export const HALF_X = 9 // halbe Hausbreite
export const HALF_Z = 6 // halbe Haustiefe
export const DOOR_HALF = 1.6 // halbe Türbreite
export const ELEVATOR_EXIT = [-7.2, 4] // Position vor dem Aufzug (x, z)

export const OUTDOOR = {
  trees: [[-15, 12, 1.5], [15, 11, 1.3], [-19, -4, 1.4], [20, 2, 1.2], [-8, 24, 1.3], [10, 26, 1.5], [-26, 16, 1.4], [28, 18, 1.2]],
  bollards: [-14, -10, -6, 6, 10, 14].map((x) => [x, 19]),
  sofa: [-8, 13.5],
  bench: [8, 13.5],
  lamp: [-5.6, 12.6],
}
