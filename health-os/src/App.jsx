import { useHealthOS } from './hooks/useHealthOS.js'
import { useStage } from './hooks/useStage.js'
import { CommandBanner, Header, McpLog } from './components/Header.jsx'
import { ViewSwitch } from './components/ViewSwitch.jsx'
import { Hub, HubArt } from './components/Hub.jsx'
import { RoomPanel } from './components/RoomPanel.jsx'
import { BodyScanner } from './components/Column1.jsx'
import { XpHeader, Gauntlet } from './components/Column2.jsx'
import { WhoopWidget, NetTunnel, SleepChart } from './components/Column3.jsx'
import { Retatrutide, Nutrition, Overrides } from './components/Column4.jsx'
import { Hypnogram, MissionBar, TodayOnTrack, WalkCalc } from './components/Analysis.jsx'
import { KfaCompact, NutritionHud, WeightCompact } from './components/Hud.jsx'
import { HistoryView } from './views/History.jsx'
import { WeekView } from './views/Week.jsx'
import { PharmaView } from './views/Pharma.jsx'
import { TrainingView } from './views/Training.jsx'
import { BlocksTable, BodyComposition, BodyScanner2D, ForecastPanel, KfaTabs, MissionPanel, PhasePlan, TodayCards, TopBar, WeekTrend } from './components/Analysis2.jsx'

const Col = ({ children, className = '' }) => (
  <div className={`flex min-h-0 min-w-0 flex-col gap-3 wide:overflow-hidden ${className}`}>{children}</div>
)

/** HQ-Ansicht (Entwurf Bild 3): Artwork als Hintergrund, HUD-Karten schweben darüber. */
function HqView({ os, stage }) {
  if (!stage.on) {
    return (
      <main className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="col-span-full"><Hub os={os} /></div>
        <Col><BodyScanner os={os} compact /><WeightCompact os={os} /><KfaCompact os={os} /></Col>
        <Col><XpHeader os={os} /><Gauntlet os={os} compact /><NetTunnel os={os} compact /></Col>
        <Col><WhoopWidget os={os} compact /><SleepChart os={os} compact /></Col>
        <Col><Retatrutide os={os} compact /><NutritionHud os={os} /><Overrides os={os} /></Col>
      </main>
    )
  }
  return (
    <main className="relative grid min-h-0 flex-1 grid-cols-[1fr_1.17fr_.89fr_.95fr_1.19fr] gap-3">
      <div className="pointer-events-none absolute inset-0 z-0"><div className="pointer-events-auto h-full"><HubArt os={os} /></div></div>
      <Col className="z-10"><BodyScanner os={os} compact /><WeightCompact os={os} /><KfaCompact os={os} /></Col>
      <Col className="z-10"><XpHeader os={os} /><div className="w-[58%]"><Gauntlet os={os} compact /></div><div className="mt-auto"><NetTunnel os={os} compact /></div></Col>
      <div className="z-10" />
      <Col className="z-10"><WhoopWidget os={os} compact /><div className="mt-auto"><SleepChart os={os} compact /></div></Col>
      <Col className="z-10"><Retatrutide os={os} compact /><NutritionHud os={os} /><Overrides os={os} /></Col>
    </main>
  )
}

/** Analyse-Ansicht (Entwurf Bild 4): links Körper, Mitte Mission + Tagesplan, rechts Telemetrie. */
function AnalyseView({ os, stage }) {
  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[1fr_2.8fr_1.16fr] wide:items-stretch">
      <Col><BodyScanner2D os={os} /><BodyComposition os={os} /><KfaTabs os={os} /><PhasePlan os={os} /></Col>
      <Col className="md:col-span-2 xl:col-span-1">
        <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr_1fr]">
          <XpHeader os={os} /><Gauntlet os={os} compact controls={false} /><TodayCards os={os} />
        </div>
        <MissionPanel os={os} />
        <div className="grid gap-3 lg:grid-cols-[2.4fr_1fr]"><TodayOnTrack os={os} /><WalkCalc os={os} rows={4} /></div>
        <div className="grid gap-3 lg:grid-cols-[2.5fr_1fr]"><ForecastPanel os={os} /><WeekTrend os={os} /></div>
        <BlocksTable os={os} />
      </Col>
      <Col className="md:col-span-2 xl:col-span-1">
        <WhoopWidget os={os} compact /><Hypnogram os={os} /><NetTunnel os={os} compact />
        <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr]"><Retatrutide os={os} compact monitoring /><Overrides os={os} /></div>
      </Col>
    </main>
  )
}

export default function App() {
  const os = useHealthOS()
  const stage = useStage(os.view)
  const style = stage.on ? { zoom: stage.s, width: stage.w, height: stage.h } : undefined
  return (
    <div className={stage.on ? 'overflow-hidden' : ''} style={stage.on ? { height: '100vh' } : undefined}>
      <div className="stage-root mx-auto flex min-h-screen w-full flex-col gap-3 p-3 wide:min-h-0 2xl:p-4" style={style}>
        {os.view === 'hq' ? (
          <>
            <CommandBanner command={os.command} />
            <Header os={os}>
              <MissionBar os={os} />
              <ViewSwitch view={os.view} onChange={os.actions.setView} />
            </Header>
          </>
        ) : (
          <TopBar os={os}><ViewSwitch view={os.view} onChange={os.actions.setView} /></TopBar>
        )}
        {os.view === 'hq' ? <HqView os={os} stage={stage} />
          : os.view === 'history' ? <HistoryView os={os} />
          : os.view === 'week' ? <WeekView os={os} />
          : os.view === 'pharma' ? <PharmaView os={os} />
          : os.view === 'training' ? <TrainingView os={os} />
          : <AnalyseView os={os} stage={stage} />}
        {!stage.on && <div className="no-print"><McpLog whoop={os.whoop} /></div>}
        <RoomPanel os={os} />
      </div>
    </div>
  )
}
