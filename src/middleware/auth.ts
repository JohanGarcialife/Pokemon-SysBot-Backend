import { Request, Response, NextFunction } from 'express'
import { getSupabase } from '../lib/supabase'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

/**
 * Middleware to verify Supabase access tokens.
 * Uses supabase.auth.getUser() so the token is validated against
 * the same Supabase project the frontend uses — no separate JWT_SECRET needed.
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
    }

    next()
  } catch (error) {
    console.error('[authMiddleware] Unexpected error:', error)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Optional auth middleware - doesn't fail if no token is provided.
 */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        req.user = { id: user.id, email: user.email ?? '' }
      }
    }
  } catch {
    // Silently fail for optional auth
  }

  next()
}
