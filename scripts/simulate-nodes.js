const http = require('http')
const { spawn } = require('child_process')

const NODE_COUNT = Number(process.env.NODES || 5)
const TX_PER_SECOND = Number(process.env.TX_PER_SECOND || 20)
const BASE_HTTP_PORT = Number(process.env.BASE_HTTP_PORT || 3001)
const BASE_P2P_PORT = Number(process.env.BASE_P2P_PORT || 5001)
const MINE_EVERY_MS = Number(process.env.MINE_EVERY_MS || 0)

const randomHex = (length) => {
  let value = ''
  while (value.length < length) {
    value += Math.floor(Math.random() * 16).toString(16)
  }
  return value
}

const postJson = (port, path, payload) => new Promise((resolve, reject) => {
  const body = JSON.stringify(payload)
  const req = http.request({
    hostname: 'localhost',
    port,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    res.resume()
    res.on('end', resolve)
  })

  req.on('error', reject)
  req.write(body)
  req.end()
})

const get = (port, path) => new Promise((resolve, reject) => {
  const req = http.get({ hostname: 'localhost', port, path }, (res) => {
    res.resume()
    res.on('end', resolve)
  })
  req.on('error', reject)
})

const nodes = Array.from({ length: NODE_COUNT }, (_, index) => {
  const httpPort = BASE_HTTP_PORT + index
  const p2pPort = BASE_P2P_PORT + index
  const peers = Array.from({ length: index }, (_, peerIndex) => {
    return `ws://localhost:${BASE_P2P_PORT + peerIndex}`
  }).join(',')

  return {
    name: `node-${index + 1}`,
    HTTP_PORT: String(httpPort),
    P2P_PORT: String(p2pPort),
    PEERS: peers
  }
})

const children = nodes.map((node) => {
  const child = spawn(process.execPath, ['backend/server.js'], {
    env: { ...process.env, ...node },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const prefix = `[${node.name}]`
  child.stdout.on('data', (data) => process.stdout.write(`${prefix} ${data}`))
  child.stderr.on('data', (data) => process.stderr.write(`${prefix} ${data}`))
  return child
})

let sent = 0
let failed = 0
let cursor = 0

const makeTransaction = () => ({
  recipient: `04${randomHex(128)}`,
  amount: Math.floor(Math.random() * 100) + 1,
  id_kartu: `SIM-${Date.now().toString(36).toUpperCase()}-${randomHex(6).toUpperCase()}`
})

const sendBurst = async () => {
  const delay = Math.max(1, Math.floor(1000 / TX_PER_SECOND))

  setInterval(async () => {
    const node = nodes[cursor % nodes.length]
    cursor += 1

    try {
      await postJson(Number(node.HTTP_PORT), '/transac', makeTransaction())
      sent += 1
    } catch (error) {
      failed += 1
    }
  }, delay)
}

console.log(`Simulasi ${NODE_COUNT} node dimulai.`)
nodes.forEach((node) => {
  console.log(`- ${node.name}: http://localhost:${node.HTTP_PORT} / ws://localhost:${node.P2P_PORT}`)
})
console.log(`Target transaksi: ${TX_PER_SECOND}/detik. Tekan Ctrl+C untuk stop.`)

setTimeout(sendBurst, 1500)

setInterval(() => {
  console.log(`[simulator] sent=${sent} failed=${failed}`)
}, 5000)

if (MINE_EVERY_MS > 0) {
  setInterval(() => {
    get(Number(nodes[0].HTTP_PORT), '/mine-transactions').catch(() => {
      failed += 1
    })
  }, MINE_EVERY_MS)
}

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
