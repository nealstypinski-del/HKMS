import { useHealthOS } from './hooks/useHealthOS.js'
import { CommandBanner, Header, McpLog } from './components/Header.jsx'
import Column1 from './components/Column1.jsx'
import Column2 from './components/Column2.jsx'
import Column3 from './components/Column3.jsx'
import Column4 from './components/Column4.jsx'

export default function App() {
  const os = useHealthOS()
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col gap-4 p-4 2xl:p-6">
      <CommandBanner command={os.command} />
      <Header os={os} />
      {/* 4-Spalten-HUD: 1 → 2 → 4 Spalten, auf 32:9 füllt es die volle Breite */}
      <main className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Column1 os={os} />
        <Column2 os={os} />
        <Column3 os={os} />
        <Column4 os={os} />
      </main>
      <McpLog whoop={os.whoop} />
    </div>
  )
}
