// Startet Whoop-Bridge und Vite-Dev-Server gemeinsam (npm start).
import { spawn } from 'node:child_process'
const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
const kids = [run('node', ['server/whoop-bridge.mjs']), run('npx', ['vite', '--open'])]
const stop = () => kids.forEach((k) => k.kill())
process.on('SIGINT', stop); process.on('exit', stop)
kids.forEach((k) => k.on('exit', stop))
