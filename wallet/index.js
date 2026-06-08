const ChainUtil = require('../chain-util')
const { INITIAL_BALANCE } = require('../config')
const Transaction = require('./transaction')
 
class Wallet {
    constructor() {
        this.balance = INITIAL_BALANCE
        this.keyPair = ChainUtil.genKeyPair()
        this.publicKey = this.keyPair.getPublic().encode('hex')
        this.id_kartu = null
    }

    toString() {
        return `wallet - 
            publicKey: ${this.publicKey.toString()}    
            balance  : ${this.balance}    
        `
    }

    // buat signature dari transaksi 
    sign(dataHash) {
        return this.keyPair.sign(dataHash)
    }

    createTransaction(recipient, amount, id_kartu, blockchain, transactionPool) {
        const options = this.normalizeTransactionArgs(id_kartu, blockchain, transactionPool)

        this.id_kartu = options.id_kartu

        // calculate the balance 
        this.balance = this.calculateBalance(options.blockchain)

        if (amount > this.balance) {
            console.log(`Amount: ${amount} exceed the current balance: ${this.balance}`)
            return
        }

        // check the transaction exist or not 
        let transaction = options.transactionPool.existingTransaction(this.publicKey)

        if (transaction) {
            // update if exist
            transaction.update(this, recipient, amount)
        } else {
            // create new one if not exist
            transaction = Transaction.newTransaction(this, recipient, amount)
            options.transactionPool.updateOrAddTransaction(transaction)
        }

        return transaction
    }

    normalizeTransactionArgs(id_kartu, blockchain, transactionPool) {
        if (id_kartu && id_kartu.chain) {
            return {
                id_kartu: null,
                blockchain: id_kartu,
                transactionPool: blockchain
            }
        }

        return { id_kartu, blockchain, transactionPool }
    }

    // function to calculate the final balance 
    calculateBalance(blockchain) {
        let balance = this.balance
        let transactions = []

        // blockchain data dimasuk ke array of transaction
        blockchain.chain.forEach(block => block.data.forEach(transaction => {
            transactions.push(transaction)
        }))
        // transaksi dalam array tsb dimasukin ke walletInput
        const walletInputTs = transactions
            .filter(transaction => transaction.input.address === this.publicKey)
        
        let startTime = 0

        // dicari transaksi yang paling recent
        if (walletInputTs.length > 0){
            const recentInputT = walletInputTs.reduce(
                (prev, current) => prev.input.timestamp > current.input.timestamp ? prev : current
            )

            balance = recentInputT.outputs.find(output => output.address === this.publicKey).amount
            startTime = recentInputT.input.timestamp
        }

        // kalkulasi balance dengan transaksi yang paling trakhir
        transactions.forEach(transaction => {
            if (transaction.input.timestamp > startTime) {
                transaction.outputs.find(output => {
                    if (output.address === this.publicKey){
                        balance += output.amount
                    } 
                })
            }
        })

        return balance
    }
}

module.exports = Wallet
