import { useEffect, useState } from 'react'
import { QUALITY } from './config/bergpark.config.js'
import OutdoorEnvironment from './environment/OutdoorEnvironment.jsx'
import BergparkTerrain from './terrain/BergparkTerrain.jsx'
import OutdoorGround from './hq/OutdoorGround.jsx'
import PathNetwork from './hq/PathNetwork.jsx'
import OutdoorProps from './hq/OutdoorProps.jsx'
import HQExterior from './hq/HQExterior.jsx'
import CascadeSystem from './cascades/CascadeSystem.jsx'
import ResultPool from './cascades/ResultPool.jsx'
import HerkulesMonument from './herkules/HerkulesMonument.jsx'
import ForestSystem from './forest/ForestSystem.jsx'
import { worldZones } from './streaming/WorldZoneManager.js'
import OutdoorAgents from './agents/OutdoorAgents.jsx'

// Die gesamte Außenwelt in einer Szene. Eine Welt, skalierbare Qualität (LOW, MEDIUM, HIGH).
export default function DigitalBergpark({ settings, agentApi }) {
  const quality = QUALITY[settings.quality]
  const [interior, setInterior] = useState(false)
  useEffect(() => {
    const update = () => {
      const s = worldZones.get('HQ_INTERIOR')
      setInterior(s === 'LOADED' || s === 'HIGH_DETAIL')
    }
    update()
    return worldZones.subscribe(update)
  }, [])
  return (
    <>
      <OutdoorEnvironment quality={quality} />
      <BergparkTerrain receiveShadow={quality.shadows} />
      <OutdoorGround />
      <PathNetwork />
      <HQExterior interiorLoaded={interior && settings.interior} />
      <OutdoorProps quality={quality} />
      <CascadeSystem quality={quality} waterQuality={quality.water} />
      <ResultPool waterQuality={quality.water} />
      <HerkulesMonument />
      <ForestSystem quality={quality} />
      <OutdoorAgents settings={settings} quality={quality} api={agentApi} />
    </>
  )
}
