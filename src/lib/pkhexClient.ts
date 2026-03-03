import axios from 'axios'
import { PokemonBuildPayload } from './order-types'
import { buildShowdownText } from './showdownBuilder'
import fs from 'fs'

/**
 * PKHeX Sidecar Client
 * Calls the PKHeX HTTP sidecar running on the bot's Windows PC
 * to convert a Showdown-format string into a valid .pk9 binary.
 */

const PKHEX_SIDECAR_URL = process.env.PKHEX_SIDECAR_URL || 'http://100.90.194.72:5001'

/**
 * Converts a single Pokémon payload to a .pk9 binary buffer.
 * Calls the PKHeX sidecar via HTTP.
 */
export async function convertToPk9(pokemon: PokemonBuildPayload): Promise<Buffer> {
  const showdownText = buildShowdownText(pokemon)
  
  console.log(`[PKHeX] Converting ${pokemon.species} to .pk9...`)
  console.log(`[PKHeX] Showdown text:\n${showdownText}`)

  const response = await axios.post(`${PKHEX_SIDECAR_URL}/generate`, showdownText, {
    headers: { 'Content-Type': 'text/plain' },
    responseType: 'arraybuffer',
    timeout: 10000,
  })

  if (response.status !== 200) {
    throw new Error(`PKHeX sidecar returned error: ${response.status}`)
  }

  const buffer = Buffer.from(response.data)
  console.log(`[PKHeX] ✅ ${pokemon.species} converted → ${buffer.length} bytes`)
  return buffer
}

/**
 * Saves a .pk9 buffer to a temp path.
 */
export function savePk9ToTemp(buffer: Buffer, filename: string): string {
  const tempPath = `/tmp/${filename}`
  fs.writeFileSync(tempPath, buffer)
  return tempPath
}
