import { PokemonBuildPayload } from './order-types'

/**
 * Converts a PokemonBuildPayload to a Showdown-format string.
 * This format is understood by PKHeX's AutoLegalityMod (ALM)
 * and will produce a valid, legal .pk9 / .pk1-9 file.
 *
 * Supported ALM extensions beyond base Showdown format:
 *   Ball: Master Ball
 *   Alpha: Yes            (Legends ZA)
 *   Shiny: Yes
 *   Language: spa
 *
 * Example for Legends ZA:
 *   Charmander
 *   Ability: Blaze
 *   Level: 50
 *   Ball: Poké Ball
 *   Jolly Nature
 *   - Ember
 *   - Growl
 *   - Scratch
 *   - Smokescreen
 */

const LEGENDS_ZA_GAME = 'legends-za'

// Ball name mappings (Showdown → ALM-accepted names)
const BALL_NAME_MAP: Record<string, string> = {
  'poke ball':     'Poké Ball',
  'pokeball':      'Poké Ball',
  'poke':          'Poké Ball',
  'great ball':    'Great Ball',
  'ultra ball':    'Ultra Ball',
  'master ball':   'Master Ball',
  'safari ball':   'Safari Ball',
  'net ball':      'Net Ball',
  'dive ball':     'Dive Ball',
  'nest ball':     'Nest Ball',
  'repeat ball':   'Repeat Ball',
  'timer ball':    'Timer Ball',
  'luxury ball':   'Luxury Ball',
  'premier ball':  'Premier Ball',
  'dusk ball':     'Dusk Ball',
  'heal ball':     'Heal Ball',
  'quick ball':    'Quick Ball',
  'cherish ball':  'Cherish Ball',
  'fast ball':     'Fast Ball',
  'level ball':    'Level Ball',
  'lure ball':     'Lure Ball',
  'heavy ball':    'Heavy Ball',
  'love ball':     'Love Ball',
  'friend ball':   'Friend Ball',
  'moon ball':     'Moon Ball',
  'sport ball':    'Sport Ball',
  'park ball':     'Park Ball',
  'dream ball':    'Dream Ball',
  'beast ball':    'Beast Ball',
}

function normalizeBallName(ball: string): string {
  const lower = ball.toLowerCase().trim()
  return BALL_NAME_MAP[lower] ?? capitalize(ball)
}

export function buildShowdownText(pokemon: PokemonBuildPayload, gameVersion?: string): string {
  const lines: string[] = []
  const isLegendsZA = gameVersion === LEGENDS_ZA_GAME

  // ── Header: Species @ HeldItem ───────────────────────────────────────
  const hasHeldItem = pokemon.heldItem &&
    pokemon.heldItem.trim() !== '' &&
    pokemon.heldItem.toLowerCase() !== 'none'
  const speciesLine = hasHeldItem
    ? `${capitalize(pokemon.species)} @ ${capitalize(pokemon.heldItem!)}`
    : capitalize(pokemon.species)
  lines.push(speciesLine)

  // ── Ability ──────────────────────────────────────────────────────────
  if (pokemon.ability) {
    lines.push(`Ability: ${capitalize(pokemon.ability)}`)
  }

  // ── Level ────────────────────────────────────────────────────────────
  lines.push(`Level: ${pokemon.level}`)

  // ── Shiny ────────────────────────────────────────────────────────────
  if (pokemon.shiny) {
    lines.push('Shiny: Yes')
  }

  // ── Alpha (Legends ZA only) ───────────────────────────────────────────
  if (pokemon.alpha && isLegendsZA) {
    lines.push('Alpha: Yes')
  }

  // ── Gender ───────────────────────────────────────────────────────────
  if (pokemon.gender === 'M') lines.push('Gender: Male')
  else if (pokemon.gender === 'F') lines.push('Gender: Female')

  // ── Tera Type (not applicable for Legends ZA) ────────────────────────
  if (pokemon.teraType && !isLegendsZA) {
    lines.push(`Tera Type: ${capitalize(pokemon.teraType)}`)
  }

  // ── Ball ─────────────────────────────────────────────────────────────
  // ALM supports "Ball: <name>" to set exactly which Poké Ball is used.
  // This is mandatory for legality — without it, ALM may assign an illegal ball.
  if (pokemon.pokeball) {
    lines.push(`Ball: ${normalizeBallName(pokemon.pokeball)}`)
  }

  // ── EVs (not applicable for Legends ZA) ──────────────────────────────
  if (!isLegendsZA) {
    const evParts = buildStatLine(pokemon.evs)
    if (evParts) lines.push(`EVs: ${evParts}`)
  }

  // ── Nature ───────────────────────────────────────────────────────────
  if (pokemon.nature) {
    lines.push(`${capitalize(pokemon.nature)} Nature`)
  }

  // ── IVs (only show non-31 values) ──────────────────────────────────
  const ivParts = buildStatLine(pokemon.ivs, 31)
  if (ivParts) lines.push(`IVs: ${ivParts}`)

  // ── Moves ────────────────────────────────────────────────────────────
  // For Legends ZA: DO NOT send moves. ALM auto-assigns the legal learnset for ZA.
  // Moves from PokeAPI reflect the SV learnset — many don't exist in ZA and ALM rejects them.
  // For Scarlet/Violet: send moves as provided by the user.
  if (!isLegendsZA) {
    const validMoves = pokemon.moves.filter(Boolean)
    for (const move of validMoves) {
      lines.push(`- ${capitalize(move)}`)
    }
  }

  return lines.join('\n')
}


/**
 * Converts an entire team payload to a combined Showdown string (multi-set).
 */
export function teamToShowdownText(team: PokemonBuildPayload[], gameVersion?: string): string {
  return team.map((p) => buildShowdownText(p, gameVersion)).join('\n\n')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  if (!str) return str
  // Convert "light-ball" → "Light Ball", "volt-tackle" → "Volt Tackle"
  return str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
}

interface Stats {
  hp: number
  attack: number
  defense: number
  spAttack: number
  spDefense: number
  speed: number
}

/**
 * Builds a Showdown stat line string.
 * @param exclude - Only include stats that DON'T equal this value (for IVs, exclude 31)
 */
function buildStatLine(stats: Stats, exclude?: number): string {
  const mapping: [string, number][] = [
    ['HP', stats.hp],
    ['Atk', stats.attack],
    ['Def', stats.defense],
    ['SpA', stats.spAttack],
    ['SpD', stats.spDefense],
    ['Spe', stats.speed],
  ]

  const parts = mapping
    .filter(([, val]) => {
      if (exclude !== undefined) return val !== exclude
      return val > 0
    })
    .map(([label, val]) => `${val} ${label}`)

  return parts.join(' / ')
}
