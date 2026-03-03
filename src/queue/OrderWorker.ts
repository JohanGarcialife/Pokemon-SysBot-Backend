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
    const { orderId, gameVersion, payload, tradeCode } = job.data

    // Strip spaces from trade code for the filename, e.g. "9432 0374" → "94320374"
    const codeDigits = (tradeCode || '00000000').replace(/\s/g, '')

    console.log(`[OrderWorker] Processing order ${orderId} for ${gameVersion} | Trade Code: ${codeDigits}`)

    // 1. Look for an available SysBot for this game version
    const bot = connectionManager.getAvailableBot(gameVersion)

    if (!bot) {
      console.log(`[OrderWorker] No idle bot found for ${gameVersion}. Re-queueing order ${orderId}...`)
      throw new Error(`No available bot for ${gameVersion}`)
    }

    // 2. Claim the bot
    bot.status = 'TRADING'

    try {
      console.log(`[OrderWorker] Bot ${bot.id} assigned to order ${orderId}`)

      // 3. Generate and upload .pk9 files for the entire team
      const team = payload as PokemonBuildPayload[]
      const uploadedFiles: string[] = []

      for (let i = 0; i < team.length; i++) {
        const pokemon = team[i]
        try {
          // Convert payload to .pk9 binary via C# sidecar
          const pk9Buffer = await convertToPk9(pokemon)
          
          // Filename format: {tradeCode}_{species}.pk9
          // SysBot.NET reads the trade code from the filename automatically.
          const filename = `${codeDigits}_${pokemon.species}.pk9`
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

