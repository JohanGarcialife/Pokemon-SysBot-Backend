import { Worker, Job } from 'bullmq'
import { connection } from './redis'
import { ORDER_QUEUE_NAME } from './OrderQueue'
import { connectionManager } from '../sysbot/ConnectionManager'
import { deliverPk9File } from '../sysbot/SftpDelivery'
import { convertToPk9, savePk9ToTemp } from '../lib/pkhexClient'
import { PokemonBuildPayload } from '../lib/order-types'
import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Worker that processes incoming web orders.
 * It continually runs in the background.
 */
export const orderWorker = new Worker(
  ORDER_QUEUE_NAME,
  async (job: Job) => {
    const { orderId, gameVersion, payload } = job.data

    console.log(`[OrderWorker] Processing order ${orderId} for ${gameVersion}`)

    // 1. Look for an available SysBot for this game version
    const bot = connectionManager.getAvailableBot(gameVersion)

    if (!bot) {
      console.log(`[OrderWorker] No idle bot found for ${gameVersion}. Re-queueing order ${orderId}...`)
      throw new Error(`No available bot for ${gameVersion}`)
    }

    // 2. Claim the bot
    bot.status = 'TRADING'
    // Use the trade code configured in SysBot.NET's Hub settings
    const botTradeCode = bot.tradeCode
    console.log(`[OrderWorker] ℹ️  User must enter code ${botTradeCode} on their Nintendo Switch`)

    try {
      console.log(`[OrderWorker] Bot ${bot.id} assigned to order ${orderId}`)

      // 3. Generate and upload .pk9 files for the entire team
      const team = payload as PokemonBuildPayload[]
      const uploadedFiles: string[] = []

      for (let i = 0; i < team.length; i++) {
        const pokemon = team[i]
        try {
          // Convert payload to correct pk file format for the game version
          const pk9Buffer = await convertToPk9(pokemon, gameVersion)
          
          // Filename format: {species}_{shortOrderId}.pk9
          // SysBot.NET reads the file in order from the distribute folder.
          const shortId = orderId.split('-')[0]  // e.g. 'ffea41c0'
          const filename = `${pokemon.species}_${shortId}.pk9`
          const tempPath = path.join(os.tmpdir(), filename)
          
          // Save temp file
          fs.writeFileSync(tempPath, pk9Buffer)
          
          // Upload to SysBot
          await deliverPk9File(tempPath, filename)
          uploadedFiles.push(filename)
          
          // Clean up temp file
          fs.unlinkSync(tempPath)
        } catch (err) {
          console.error(`[OrderWorker] Failed to process ${pokemon.species} in order ${orderId}:`, err)
          throw err // BullMQ will retry or fail the job
        }
      }

      // 6. Free the bot after the trade window (SysBot will read and clear the file)
      setTimeout(() => {
        if (bot.status === 'TRADING') {
          bot.status = 'IDLE'
          console.log(`[OrderWorker] Bot ${bot.id} returned to IDLE`)
        }
      }, 30000) // 30 seconds – enough time for SysBot to pick up and trade

      return { success: true, botId: bot.id, uploadedFiles }
    } catch (error) {
      bot.status = 'IDLE'
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

