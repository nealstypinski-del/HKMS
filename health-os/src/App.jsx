import { useHealthOS } from './hooks/useHealthOS.js'
import { CommandBanner, Header, McpLog } from './components/Header.jsx'
import { ViewSwitch } from './components/ViewSwitch.jsx'
import { Hub } from './components/Hub.jsx'
import { RoomPanel } from './components/RoomPanel.jsx'
import { BodyScanner, WeightDeck, KfaCalculator, PhaseCard } from './components/Column1.jsx'
import { XpHeader, Gauntlet, BlocksPanel } from './components/Column2.jsx'
import { WhoopWidget, NetTunnel } from './components/Column3.jsx'
import { Retatrutide, Nutrition, Overrides } from './components/Column4.jsx'
import { Forecast, Hypnogram, Macros, MissionBar, TodayOnTrack, WalkCalc } from './components/Analysis.jsx'

// Spalten: auf 32:9 (wide) je eine scrollfreie Spalte, sonst gestapelt.
const Col = ({ children, className = '' }) => (
  <div className={`flex min-h-0 min-w-0 flex-col gap-4 wide:overflow-y-auto wide:no-scrollbar ${className}`}>{children}</div>
)

function HqView({ os }) {
  return (
    <main className="grid min-h-0 grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4 wide:flex-1 wide:grid-cols-[1fr_1fr_2.5fr_1fr_1fr] wide:items-stretch">
      <div className="col-span-full order-first wide:order-none wide:col-span-1 wide:col-start-3 wide:row-start-1">
        <Hub os={os} />
      </div>
      <Col className="wide:col-start-1 wide:row-start-1"><BodyScanner os={os} compact /><WeightDeck os={os} /><PhaseCard os={os} /><KfaCalculator os={os} /></Col>
      <Col className="wide:col-start-2 wide:row-start-1"><XpHeader os={os} /><Gauntlet os={os} /><TodayOnTrack os={os} /><Forecast os={os} /><WalkCalc os={os} /></Col>
      <Col className="wide:col-start-4 wide:row-start-1"><WhoopWidget os={os} /><Hypnogram os={os} /><NetTunnel os={os} /></Col>
      <Col className="wide:col-start-5 wide:row-start-1"><Macros os={os} /><Retatrutide os={os} /><Overrides os={os} /><Nutrition os={os} /></Col>
    </main>
  )
}

function AnalyseView({ os }) {
  return (
    <main className="grid min-h-0 grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4 wide:flex-1 wide:grid-cols-[1fr_1.35fr_1.35fr_1fr] wide:items-stretch">
      <Col><BodyScanner os={os} compact /><WeightDeck os={os} /><KfaCalculator os={os} /><PhaseCard os={os} /></Col>
      <Col><XpHeader os={os} /><Gauntlet os={os} /><TodayOnTrack os={os} /><Forecast os={os} /></Col>
      <Col><BlocksPanel os={os} /><WalkCalc os={os} /><Hypnogram os={os} /><Macros os={os} /></Col>
      <Col><WhoopWidget os={os} /><NetTunnel os={os} /><Retatrutide os={os} /><Overrides os={os} /></Col>
    </main>
  )
}

export default function App() {
  const os = useHealthOS()
  return (
    <div className="wide:h-screen wide:overflow-hidden">
    <div className="mx-auto flex min-h-screen w-full flex-col gap-4 p-4 wide:h-[125vh] wide:min-h-0 wide:[zoom:0.8] 2xl:p-6">
      <CommandBanner command={os.command} />
      <Header os={os}>
        <MissionBar os={os} />
        <ViewSwitch view={os.view} onChange={os.actions.setView} />
      </Header>
      {os.view === 'hq' ? <HqView os={os} /> : <AnalyseView os={os} />}
      <div className="wide:hidden"><McpLog whoop={os.whoop} /></div>
      <RoomPanel os={os} />
    </div>
    </div>
  )
}
