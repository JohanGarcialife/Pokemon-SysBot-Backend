import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

/**
 * Middleware to verify JWT tokens
 * Adds user data to request if valid
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string }
    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const jwtSecret = process.env.JWT_SECRET

      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string }
        req.user = decoded
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next()
}
