const { createNodeContext } = require('../backend/app/node-context')

let context

function getContext() {
  if (!context) {
    context = createNodeContext()
  }

  return context
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

module.exports = async (req, res) => {
  const { blockchain, miner, transactionPool, wallet } = getContext()
  const path = new URL(req.url, 'http://localhost').pathname

  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {})
  }

  try {
    if (req.method === 'GET' && path === '/blocks') {
      return sendJson(res, 200, blockchain.chain)
    }

    if (req.method === 'GET' && path === '/transactions') {
      return sendJson(res, 200, transactionPool.transactions)
    }

    if (req.method === 'GET' && path === '/mine-transactions') {
      miner.mine()
      return sendJson(res, 200, blockchain.chain)
    }

    if (req.method === 'GET' && path === '/public-key') {
      return sendJson(res, 200, { publicKey: wallet.publicKey })
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
      blockchain.addBlock(body.data)
      return sendJson(res, 200, blockchain.chain)
    }

    if (req.method === 'POST' && path === '/transac') {
      const { recipient, amount, id_kartu } = await readBody(req)
      const transaction = wallet.createTransaction(
        recipient,
        amount,
        id_kartu,
        blockchain,
        transactionPool
      )

      if (!transaction) {
        return sendJson(res, 400, {
          error: 'Transaction could not be created. Check recipient and amount.'
        })
      }

      return sendJson(res, 200, transactionPool.transactions)
    }

    return sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    return sendJson(res, 500, { error: error.message })
  }
}
