import {
  PokemonData,
  ValidationResult,
  ValidationError,
  IV_MIN,
  IV_MAX,
  EV_MIN,
  EV_MAX,
  EV_TOTAL_MAX,
  STATS,
  Stat,
  VALID_NATURES
} from './validation-rules'

/**
 * Validates Pokemon stats (IVs and EVs)
 */
export function validateStats(stats: PokemonData['stats']): ValidationError[] {
  const errors: ValidationError[] = []
  let evTotal = 0

  for (const stat of STATS) {
    const { iv, ev } = stats[stat]

    // Validate IVs
    if (iv < IV_MIN || iv > IV_MAX) {
      errors.push({
        field: `stats.${stat}.iv`,
        message: `IV must be between ${IV_MIN} and ${IV_MAX}`
      })
    }

    // Validate EVs
    if (ev < EV_MIN || ev > EV_MAX) {
      errors.push({
        field: `stats.${stat}.ev`,
        message: `EV must be between ${EV_MIN} and ${EV_MAX}`
      })
    }

    evTotal += ev
  }

  // Check total EVs
  if (evTotal > EV_TOTAL_MAX) {
    errors.push({
      field: 'stats',
      message: `Total EVs (${evTotal}) exceed maximum of ${EV_TOTAL_MAX}`
    })
  }

  return errors
}

/**
 * Validates Pokemon level
 */
export function validateLevel(level: number): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (level < 1 || level > 100) {
    errors.push({
      field: 'level',
      message: 'Level must be between 1 and 100'
    })
  }

  return errors
}

/**
 * Validates Pokemon moves (basic validation)
 * TODO: Implement move legality check against database
 */
export function validateMoves(moves: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  if (moves.length === 0) {
    errors.push({
      field: 'moves',
      message: 'Pokemon must have at least one move'
    })
  }

  if (moves.length > 4) {
    errors.push({
      field: 'moves',
      message: 'Pokemon cannot have more than 4 moves'
    })
  }

  // Check for duplicate moves
  const uniqueMoves = new Set(moves)
  if (uniqueMoves.size !== moves.length) {
    errors.push({
      field: 'moves',
      message: 'Duplicate moves are not allowed'
    })
  }

  return errors
}

/**
 * Validates Pokemon nature
 */
export function validateNature(nature: string): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!VALID_NATURES.includes(nature)) {
    errors.push({
      field: 'nature',
      message: `Invalid nature. Must be one of: ${VALID_NATURES.join(', ')}`
    })
  }

  return errors
}

/**
 * Master Pokemon validator
 */
export function validatePokemon(pokemon: PokemonData): ValidationResult {
  const errors: ValidationError[] = []

  // Validate all aspects
  errors.push(...validateLevel(pokemon.level))
  errors.push(...validateStats(pokemon.stats))
  errors.push(...validateMoves(pokemon.moves))
  errors.push(...validateNature(pokemon.nature))

  // Basic required fields
  if (!pokemon.species || pokemon.species.trim() === '') {
    errors.push({
      field: 'species',
      message: 'Species is required'
    })
  }

  if (!pokemon.ability || pokemon.ability.trim() === '') {
    errors.push({
      field: 'ability',
      message: 'Ability is required'
    })
  }

  if (!pokemon.nature || pokemon.nature.trim() === '') {
    errors.push({
      field: 'nature',
      message: 'Nature is required'
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
