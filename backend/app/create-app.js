const path = require('path')
const express = require('express')
const cors = require('cors')

const { registerApiRoutes } = require('./routes')

const FRONTEND_DIR = path.join(__dirname, '../../frontend')

function createApp(context) {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.static(FRONTEND_DIR))

  registerApiRoutes(app, context)

  app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'))
  })

  return app
}

module.exports = { createApp }
