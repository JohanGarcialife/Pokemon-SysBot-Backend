import { Worker, Job } from 'bullmq'
import { connection } from './redis'
import { ORDER_QUEUE_NAME } from './OrderQueue'
import { connectionManager } from '../sysbot/ConnectionManager'

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
      // Throwing an error tells BullMQ the job failed and must be retried later
      throw new Error(`No available bot for ${gameVersion}`)
    }

    // 2. We found a bot! Claim it so other jobs don't take it concurrently
    bot.status = 'TRADING'

    try {
      // 3. (PSAS-14) Here we will send the actual trade command to the bot
      console.log(`[OrderWorker] Assigned order ${orderId} to bot ${bot.id}`)
      
      // Simulate trade taking some time for now (will be replaced by actual bot interaction)
      // await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For now, immediately free the bot back to IDLE
      setTimeout(() => {
        if (bot.status === 'TRADING') {
          bot.status = 'IDLE'
          console.log(`[OrderWorker] Bot ${bot.id} returned to IDLE state`)
        }
      }, 5000)

      return { success: true, botId: bot.id }
    } catch (error) {
      // If something blows up, free the bot
      bot.status = 'IDLE'
      throw error
    }
  },
  {
    connection,
    // Concurrency mapping: how many jobs can be processed at once.
    // Since bots are hardware-limited, concurrency isn't exactly horizontal per worker unless we have many bots.
    concurrency: 5, 
  }
)

orderWorker.on('completed', (job) => {
  console.log(`[OrderWorker] Order ${job.id} officially completed and delivered.`)
})

orderWorker.on('failed', (job, err) => {
  console.log(`[OrderWorker] Order ${job?.id} failed processing (will retry): ${err.message}`)
})
