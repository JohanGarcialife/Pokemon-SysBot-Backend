import dotenv from 'dotenv'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger.config'
import { corsMiddleware } from './middleware/cors'
import { authMiddleware } from './middleware/auth'
import validateRouter from './routes/validate'
import ordersRouter from './routes/orders'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Global request logger — shows every incoming request before any middleware
app.use((req, res, next) => {
  console.log(`[server] ${req.method} ${req.path} | Origin: ${req.headers.origin ?? 'none'} | Auth: ${req.headers.authorization ? 'Bearer ***' : 'MISSING'}`)
  next()
})

// Middleware
app.use(corsMiddleware)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Swagger documentation routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pokémon SysBot API Docs',
}))

// OpenAPI JSON spec
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del servidor
 *     description: Verifica que el servidor esté funcionando correctamente
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/validate', validateRouter)
app.use('/api/orders', authMiddleware, ordersRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

import { startTcpServer } from './sysbot/tcpServer'

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`)
})

// Start TCP Server for SysBot Connections
const TCP_PORT = Number(process.env.TCP_PORT) || 5005
const tcpServer = startTcpServer(TCP_PORT)

// Start Queue Worker
import './queue/OrderWorker'

// Graceful shutdown during development (tsx watch / nodemon)
process.once('SIGUSR2', () => {
  tcpServer.close(() => {
    process.kill(process.pid, 'SIGUSR2')
  })
})

process.on('SIGINT', () => {
  tcpServer.close(() => {
    process.exit(0)
  })
})

export default app
