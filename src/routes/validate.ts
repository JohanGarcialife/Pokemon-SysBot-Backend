import express, { Request, Response } from 'express'
import { validatePokemon } from '../lib/pokemon-validator'
import { PokemonData } from '../lib/validation-rules'

const router = express.Router()

/**
 * POST /api/validate
 * Validates a Pokemon's data for legality
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const pokemonData: PokemonData = req.body

    if (!pokemonData) {
      return res.status(400).json({
        error: 'Missing Pokemon data in request body'
      })
    }

    const result = validatePokemon(pokemonData)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Validation error:', error)
    return res.status(500).json({
      error: 'Internal server error during validation'
    })
  }
})

export default router
