const { spawn } = require('child_process')

const nodes = [
  { name: 'node-utama', HTTP_PORT: '3001', P2P_PORT: '5001', PEERS: '' },
  { name: 'node-2', HTTP_PORT: '3002', P2P_PORT: '5002', PEERS: 'ws://localhost:5001' },
  { name: 'node-3', HTTP_PORT: '3003', P2P_PORT: '5003', PEERS: 'ws://localhost:5001,ws://localhost:5002' }
]

const children = nodes.map((node) => {
  const child = spawn(process.execPath, ['backend/server.js'], {
    env: { ...process.env, ...node },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const prefix = `[${node.name}]`
  child.stdout.on('data', (data) => process.stdout.write(`${prefix} ${data}`))
  child.stderr.on('data', (data) => process.stderr.write(`${prefix} ${data}`))
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${prefix} exited with code ${code}`)
    }
  })

  return child
})

console.log('Menjalankan semua node:')
nodes.forEach((node) => {
  console.log(`- ${node.name}: http://localhost:${node.HTTP_PORT} / ws://localhost:${node.P2P_PORT}`)
})
console.log('UI utama: http://localhost:3001')
console.log('Tekan Ctrl+C untuk menghentikan semua node.')

const shutdown = () => {
  children.forEach((child) => child.kill('SIGTERM'))
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})
