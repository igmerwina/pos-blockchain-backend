const { createApp } = require('../backend/app/create-app')
const { createNodeContext } = require('../backend/app/node-context')

let app

module.exports = (req, res) => {
  if (!app) {
    app = createApp(createNodeContext())
  }

  return app(req, res)
}
