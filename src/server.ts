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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`)
})

export default app
