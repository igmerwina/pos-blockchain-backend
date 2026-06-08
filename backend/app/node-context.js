const Blockchain = require('../../blockchain')
const Miner = require('./miner')
const P2pServer = require('./p2p-server')
const TransactionPool = require('../../wallet/transaction-pool')
const Wallet = require('../../wallet')

function createNodeContext() {
  const blockchain = new Blockchain()
  const wallet = new Wallet()
  const transactionPool = new TransactionPool()
  const p2p = new P2pServer(blockchain, transactionPool)
  const miner = new Miner(blockchain, transactionPool, wallet, p2p)

  return {
    blockchain,
    wallet,
    transactionPool,
    p2p,
    miner
  }
}

module.exports = { createNodeContext }
