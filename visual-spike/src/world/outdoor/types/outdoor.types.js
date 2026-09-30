// Gemeinsame Typen der Außenwelt als JSDoc (das Projekt ist reines JavaScript).

/**
 * @typedef {'LOW'|'MEDIUM'|'HIGH'} QualityLevel
 * @typedef {'DAY'|'EVENING'|'NIGHT'} TimeOfDay
 * @typedef {'CLEAR'|'CLOUDY'|'RAIN'|'FOG'|'SNOW'} WeatherState
 * @typedef {'UNLOADED'|'LOW_DETAIL'|'LOADED'|'HIGH_DETAIL'} ZoneState
 * @typedef {'plaza'|'path'|'forest'|'stairs'|'lawn'} SurfaceKind
 *
 * Absichten, die Terminal 4 (Verhalten) an die Außenwelt richten kann.
 * @typedef {'RUN_CASCADES'|'RUN_FOREST'|'WALK_CASCADES'|'WALK_TO_HERKULES'|'REST_OUTSIDE'|'STRETCH'|'RETURN_TO_HQ'} OutdoorIntent
 *
 * Darstellungswünsche an einen Avatar (die Außenwelt entscheidet nichts über Geschäftsverfügbarkeit).
 * @typedef {'WALK'|'RUN'|'STRETCH'|'REST'|'DRINK'|'SIT'|'IDLE'} AvatarActivity
 *
 * Zustand der Kaskadenvisualisierung. Die Umgebung kennt ausschließlich diese Struktur.
 * @typedef {'normal'|'blocked'|'idle'} StageStatus
 * @typedef {Object} CascadeStageState
 * @property {number} activity  0..1, Helligkeit und Fließgeschwindigkeit der Stufe
 * @property {StageStatus} status  'blocked' färbt den Stufenmarker gelb und dämpft das Licht
 * @property {number} [queued]  Anzahl wartender Aufgaben (nur für Marker)
 * @typedef {Object} CascadeVisualizationState
 * @property {number} activityLevel  0..1, globale Wasserintensität
 * @property {{strategy:CascadeStageState,research:CascadeStageState,production:CascadeStageState,review:CascadeStageState,approval:CascadeStageState,output:CascadeStageState}} stages
 *
 * @typedef {Object} ActivityAnchor
 * @property {string} id
 * @property {'run'|'checkpoint'|'stretch'|'bench'|'water'|'viewpoint'|'coffee'|'door'} kind
 * @property {number} x
 * @property {number} z
 * @property {number} yaw  Blickrichtung in Radiant (0 = +Z)
 * @property {number} capacity
 * @property {OutdoorIntent[]} intents
 * @property {string} [routeId]
 */
export {}
