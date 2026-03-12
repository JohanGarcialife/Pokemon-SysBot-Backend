import { Worker, Job } from 'bullmq'
import { connection } from './redis'
import { ORDER_QUEUE_NAME } from './OrderQueue'
import { connectionManager } from '../sysbot/ConnectionManager'
import { discordBridge } from '../sysbot/DiscordBridge'
import { buildShowdownText } from '../lib/showdownBuilder'
import { PokemonBuildPayload } from '../lib/order-types'

/**
 * Worker that processes incoming web orders.
 * It continually runs in the background.
 */
export const orderWorker = new Worker(
  ORDER_QUEUE_NAME,
  async (job: Job) => {
    const { orderId, gameVersion, payload, tradeCode } = job.data

    console.log(`[OrderWorker] Processing order ${orderId} for ${gameVersion}`)

    // We no longer require BotConnector TCP presence locally.
    // The backend just sends orders straight to Discord for SysBot to read.
    const botTradeCode = tradeCode || Math.floor(10000000 + Math.random() * 90000000).toString()
    console.log(`[OrderWorker] ℹ️  User must enter code ${botTradeCode} on their Nintendo Switch`)

    try {
      console.log(`[OrderWorker] Sending order ${orderId} directly to Discord`)

      // 3. Generate and upload .pk9 files for the entire team
      const team = payload as PokemonBuildPayload[]
      const uploadedFiles: string[] = []

      for (let i = 0; i < team.length; i++) {
        const pokemon = team[i]
        try {
          // Convert payload to Showdown text directly using our builder
          const showdownText = buildShowdownText(pokemon, gameVersion)

          // Send to Discord via the selfbot bridge, passing the trade code
          const success = await discordBridge.sendTradeCommand(showdownText, botTradeCode)
          
          if (!success) {
            throw new Error(`DiscordBridge failed to send command for ${pokemon.species}. Please ensure the bridge is connected and the channel ID is valid.`)
          }
          
          uploadedFiles.push(`Sent via Discord: ${pokemon.species}`)
          
        } catch (err) {
          console.error(`[OrderWorker] Failed to process ${pokemon.species} in order ${orderId}:`, err)
          throw err // BullMQ will retry or fail the job
        }
      }

      // Success
      return { success: true, uploadedFiles }
    } catch (error) {
      throw error
    }
  },
  {
    connection,
    concurrency: 5,
  }
)

orderWorker.on('completed', (job) => {
  console.log(`[OrderWorker] ✅ Order ${job.id} was delivered successfully.`)
})

orderWorker.on('failed', (job, err) => {
  console.log(`[OrderWorker] ❌ Order ${job?.id} failed (will retry): ${err.message}`)
})

