const fs = require('fs')
const path = require('path')

const requiredFiles = [
  'frontend/index.html',
  'frontend/assets/app.js',
  'frontend/assets/styles.css'
]

requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, '..', file)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing frontend asset: ${file}`)
  }
})

const sourceDir = path.join(__dirname, '..', 'frontend')
const outputDir = path.join(__dirname, '..', 'public')

fs.rmSync(outputDir, { recursive: true, force: true })
fs.cpSync(sourceDir, outputDir, { recursive: true })

console.log('Vercel static frontend is ready in public/.')
