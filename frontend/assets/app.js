const { createApp } = Vue

createApp({
  data() {
    return {
      blocks: [],
      transactions: [],
      publicKey: '',
      nodeInfo: null,
      loading: false,
      selectedBlockHash: '',
      message: { type: 'success', text: 'Mode manual aktif. Klik Refresh node untuk mengambil data backend.' },
      simulation: {
        nodes: 8,
        txPerSecond: 100,
        mineEveryMs: 0
      },
      amountOptions: [25, 50, 75, 100, 150, 200],
      transactionForm: {
        recipient: '',
        amount: 100,
        id_kartu: ''
      }
    }
  },
  computed: {
    latestBlock() {
      return this.blocks[this.blocks.length - 1]
    },
    selectedBlock() {
      return this.blocks.find((block) => block.hash === this.selectedBlockHash) || this.latestBlock
    }
  },
  mounted() {
    this.regenerateTransaction()
    this.message = { type: 'success', text: 'Mode manual aktif. Klik Refresh node untuk mengambil data backend.' }
  },
  methods: {
    async request(path, options) {
      const response = await fetch(path, options)
      if (!response.ok) {
        throw new Error(`Request gagal: ${response.status}`)
      }
      return response.json()
    },
    async refresh() {
      this.loading = true
      try {
        const [blocks, transactions, key, nodeInfo] = await Promise.all([
          this.request('/blocks'),
          this.request('/transactions'),
          this.request('/public-key'),
          this.request('/node-info')
        ])
        this.blocks = blocks
        this.transactions = transactions
        this.publicKey = key.publicKey
        this.nodeInfo = nodeInfo
        if (!this.selectedBlockHash && blocks.length) {
          this.selectedBlockHash = blocks[blocks.length - 1].hash
        }
        this.message = { type: 'success', text: 'Node data tersinkron.' }
      } catch (error) {
        this.message = { type: 'error', text: error.message }
      } finally {
        this.loading = false
      }
    },
    async createTransaction() {
      this.loading = true
      try {
        this.ensureTransactionDefaults()
        await this.request('/transac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.transactionForm)
        })
        this.regenerateTransaction()
        await this.refresh()
        this.message = { type: 'success', text: 'Transaksi demo masuk ke pool.' }
      } catch (error) {
        this.message = { type: 'error', text: error.message }
      } finally {
        this.loading = false
      }
    },
    async mineTransactions() {
      this.loading = true
      try {
        await this.request('/mine-transactions')
        await this.refresh()
        this.selectedBlockHash = this.latestBlock ? this.latestBlock.hash : ''
        this.message = { type: 'success', text: 'Pending transaction berhasil dimining.' }
      } catch (error) {
        this.message = { type: 'error', text: error.message }
      } finally {
        this.loading = false
      }
    },
    async mineBlock() {
      this.loading = true
      try {
        await this.request('/mine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: this.generateBlockData() })
        })
        await this.refresh()
        this.selectedBlockHash = this.latestBlock ? this.latestBlock.hash : ''
        this.message = { type: 'success', text: 'Block demo otomatis tersambung ke chain.' }
      } catch (error) {
        this.message = { type: 'error', text: error.message }
      } finally {
        this.loading = false
      }
    },
    simulationCommand() {
      const parts = [
        `NODES=${this.simulation.nodes}`,
        `TX_PER_SECOND=${this.simulation.txPerSecond}`
      ]
      if (Number(this.simulation.mineEveryMs) > 0) {
        parts.push(`MINE_EVERY_MS=${this.simulation.mineEveryMs}`)
      }
      return `${parts.join(' ')} npm run simulate:nodes`
    },
    simulatedNodes() {
      return Array.from({ length: Number(this.simulation.nodes) || 0 }, (_, index) => ({
        name: `node-${index + 1}`,
        http: 3001 + index,
        p2p: 5001 + index
      }))
    },
    regenerateTransaction() {
      this.transactionForm = {
        recipient: this.generatePublicKey(),
        amount: this.generateAmount(),
        id_kartu: this.generateId('CARD')
      }
      this.message = { type: 'success', text: 'Data transaksi demo dibuat otomatis.' }
    },
    ensureTransactionDefaults() {
      if (!this.transactionForm.recipient) {
        this.transactionForm.recipient = this.generatePublicKey()
      }
      if (!Number(this.transactionForm.amount)) {
        this.transactionForm.amount = this.generateAmount()
      }
      if (!this.transactionForm.id_kartu) {
        this.transactionForm.id_kartu = this.generateId('CARD')
      }
    },
    generateBlockData() {
      return JSON.stringify({
        type: 'auto-demo-block',
        reference: this.generateId('BLK'),
        createdAt: new Date().toISOString(),
        pendingTransactions: this.transactions.length,
        latestHash: this.latestBlock ? this.shortHash(this.latestBlock.hash) : 'genesis'
      })
    },
    generateAmount() {
      return this.amountOptions[Math.floor(Math.random() * this.amountOptions.length)]
    },
    generatePublicKey() {
      return `04${this.randomHex(128)}`
    },
    generateId(prefix) {
      return `${prefix}-${Date.now().toString(36).toUpperCase()}-${this.randomHex(4).toUpperCase()}`
    },
    randomHex(length) {
      const bytes = new Uint8Array(Math.ceil(length / 2))
      crypto.getRandomValues(bytes)
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, length)
    },
    shortHash(value) {
      if (!value) return ''
      return `${value.slice(0, 10)}...${value.slice(-6)}`
    },
    formatTime(timestamp) {
      if (!timestamp) return 'pending'
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(timestamp))
    },
    prettyData(data) {
      if (typeof data === 'string') return data
      return JSON.stringify(data, null, 2)
    }
  }
}).mount('#app')
