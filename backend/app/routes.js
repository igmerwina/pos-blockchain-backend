function registerApiRoutes(app, context) {
  const { blockchain, miner, p2p, transactionPool, wallet } = context

  app.get('/blocks', (req, res) => {
    res.json(blockchain.chain)
  })

  app.post('/mine', (req, res) => {
    const block = blockchain.addBlock(req.body.data)
    console.log(`New block added: ${block.toString()}`)

    p2p.syncChains()
    res.redirect('/blocks')
  })

  app.get('/transactions', (req, res) => {
    res.json(transactionPool.transactions)
  })

  app.post('/transac', (req, res) => {
    const { recipient, amount, id_kartu } = req.body
    const transaction = wallet.createTransaction(
      recipient,
      amount,
      id_kartu,
      blockchain,
      transactionPool
    )

    if (!transaction) {
      return res.status(400).json({
        error: 'Transaction could not be created. Check recipient and amount.'
      })
    }

    p2p.broadcastTransaction(transaction)
    return res.redirect('/transactions')
  })

  app.get('/mine-transactions', (req, res) => {
    const block = miner.mine()
    console.log(`New block added: ${block.toString()}`)

    res.redirect('/blocks')
  })

  app.get('/public-key', (req, res) => {
    res.json({ publicKey: wallet.publicKey })
  })

  app.get('/node-info', (req, res) => {
    const httpPort = process.env.HTTP_PORT || '3001'
    const p2pPort = process.env.P2P_PORT || '5001'
    const peers = process.env.PEERS ? process.env.PEERS.split(',').filter(Boolean) : []

    res.json({
      name: process.env.name || process.env.NAME || `node-${httpPort}`,
      httpPort,
      p2pPort,
      peers
    })
  })
}

module.exports = { registerApiRoutes }
