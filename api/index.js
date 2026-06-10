const crypto = require('crypto')

let state

function hash(data) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
}

function createBlock(lastBlock, data) {
  const timestamp = Date.now()
  const lastHash = lastBlock ? lastBlock.hash : '----'
  const difficulty = lastBlock ? lastBlock.difficulty : 3
  const nonce = Math.floor(Math.random() * 1000000)
  const blockHash = hash({ timestamp, lastHash, data, nonce, difficulty })

  return {
    timestamp,
    lastHash,
    hash: blockHash,
    data,
    nonce,
    difficulty
  }
}

function createState() {
  const publicKey = crypto
    .createHash('sha256')
    .update(`vercel-wallet-${Date.now()}-${Math.random()}`)
    .digest('hex')

  const genesis = createBlock(null, [])

  return {
    publicKey,
    balance: 100000,
    chain: [genesis],
    transactions: []
  }
}

function getState() {
  if (!state) {
    state = createState()
  }

  return state
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) return resolve(req.body)

    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      if (!body) return resolve({})

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.end(JSON.stringify(payload))
}

function addBlock(appState, data) {
  const block = createBlock(appState.chain[appState.chain.length - 1], data)
  appState.chain.push(block)
  return block
}

function createTransaction(appState, recipient, amount, idKartu) {
  const value = Number(amount)

  if (!recipient || !Number.isFinite(value) || value <= 0 || value > appState.balance) {
    return null
  }

  appState.balance -= value

  const transaction = {
    id: crypto.randomUUID(),
    input: {
      timestamp: Date.now(),
      id_kartu: hash(idKartu || 'VERCEL-CARD'),
      amount: appState.balance + value,
      address: appState.publicKey,
      signature: hash({ recipient, value, idKartu, timestamp: Date.now() })
    },
    outputs: [
      { amount: appState.balance, address: appState.publicKey },
      { amount: value, address: recipient }
    ]
  }

  appState.transactions.push(transaction)
  return transaction
}

module.exports = async (req, res) => {
  const appState = getState()
  const path = new URL(req.url, 'http://localhost').pathname

  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {})
  }

  try {
    if (req.method === 'GET' && path === '/blocks') {
      return sendJson(res, 200, appState.chain)
    }

    if (req.method === 'GET' && path === '/transactions') {
      return sendJson(res, 200, appState.transactions)
    }

    if (req.method === 'GET' && path === '/mine-transactions') {
      addBlock(appState, appState.transactions)
      appState.transactions = []
      return sendJson(res, 200, appState.chain)
    }

    if (req.method === 'GET' && path === '/public-key') {
      return sendJson(res, 200, { publicKey: appState.publicKey })
    }

    if (req.method === 'GET' && path === '/node-info') {
      return sendJson(res, 200, {
        name: process.env.name || process.env.NAME || 'vercel-node',
        httpPort: 'vercel',
        p2pPort: 'disabled',
        peers: []
      })
    }

    if (req.method === 'POST' && path === '/mine') {
      const body = await readBody(req)
      addBlock(appState, body.data)
      return sendJson(res, 200, appState.chain)
    }

    if (req.method === 'POST' && path === '/transac') {
      const { recipient, amount, id_kartu } = await readBody(req)
      const transaction = createTransaction(appState, recipient, amount, id_kartu)

      if (!transaction) {
        return sendJson(res, 400, {
          error: 'Transaction could not be created. Check recipient and amount.'
        })
      }

      return sendJson(res, 200, appState.transactions)
    }

    return sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    return sendJson(res, 500, { error: error.message })
  }
}
