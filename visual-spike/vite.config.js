import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './': Der Build läuft aus jedem Verzeichnis (auch gehostet), Modelle liegen unter models/
export default defineConfig({ base: './', plugins: [react()] })
