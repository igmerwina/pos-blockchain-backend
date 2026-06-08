const { createApp } = require('./app/create-app')
const { createNodeContext } = require('./app/node-context')

const HTTP_PORT = process.env.HTTP_PORT || 3001

const context = createNodeContext()
const app = createApp(context)

app.listen(HTTP_PORT, () => {
  console.log(`HTTP server running at http://localhost:${HTTP_PORT}`)
})

context.p2p.listen()
