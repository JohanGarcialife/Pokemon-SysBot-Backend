import { Worker, Job } from 'bullmq'
import { connection } from './redis'
import { ORDER_QUEUE_NAME } from './OrderQueue'
import { connectionManager } from '../sysbot/ConnectionManager'
import { deliverPk9File } from '../sysbot/SftpDelivery'
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

    try {
      console.log(`[OrderWorker] Bot ${bot.id} assigned to order ${orderId}`)

      // 3. Generate the temp .pk9 file 
      // NOTE (PSAS-15): This will use pkhex-server or local generation to build a real .pk9 from `payload`
      // For now we write a stub file so the distribution pipeline can be tested end-to-end
      const filename = `order_${orderId}.pk9`
      const tempPath = path.join(os.tmpdir(), filename)
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2)) // stub for now

      // 4. Deliver to the SysBot distribute folder via SFTP
      await deliverPk9File(tempPath, filename)

      // 5. Clean up temp file
      fs.unlinkSync(tempPath)

      // 6. Free the bot after the trade window (SysBot will read and clear the file)
      setTimeout(() => {
        if (bot.status === 'TRADING') {
          bot.status = 'IDLE'
          console.log(`[OrderWorker] Bot ${bot.id} returned to IDLE`)
        }
      }, 30000) // 30 seconds – enough time for SysBot to pick up and trade

      return { success: true, botId: bot.id, filename }
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

