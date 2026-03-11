import { PokemonBuildPayload } from './order-types'

/**
 * Converts a PokemonBuildPayload to a Showdown-format string.
 * This format is understood by PKHeX's AutoLegalityMod (ALM)
 * and will produce a valid, legal .pk9 file.
 *
 * Example output:
 * Pikachu @ Light Ball
 * Ability: Static
 * Level: 50
 * Shiny: Yes
 * EVs: 252 Atk / 4 Def / 252 Spe
 * Jolly Nature
 * IVs: 31 HP
 * - Volt Tackle
 * - Iron Tail
 * - Quick Attack
 * - Thunder
 */
const LEGENDS_ZA_GAME = 'legends-za'

export function buildShowdownText(pokemon: PokemonBuildPayload, gameVersion?: string): string {
  const lines: string[] = []
  const isLegendsZA = gameVersion === LEGENDS_ZA_GAME

  // ── Header: Species @ HeldItem ──────────────────────────────────────
  // Skip held item if it's null, undefined, empty, or the literal string "None"
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

  // ── Gender ───────────────────────────────────────────────────────────
  if (pokemon.gender === 'M') lines.push('Gender: Male')
  else if (pokemon.gender === 'F') lines.push('Gender: Female')

  // ── Tera Type (not applicable for Legends ZA) ────────────────────────
  if (pokemon.teraType && !isLegendsZA) {
    lines.push(`Tera Type: ${capitalize(pokemon.teraType)}`)
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

  // ── IVs (only show non-31 values) ───────────────────────────────────
  const ivParts = buildStatLine(pokemon.ivs, 31)
  if (ivParts) lines.push(`IVs: ${ivParts}`)

  // ── Moves ─────────────────────────────────────────────────────────────
  for (const move of pokemon.moves.filter(Boolean)) {
    lines.push(`- ${capitalize(move)}`)
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
