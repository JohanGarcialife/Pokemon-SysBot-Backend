import SFTPClient from 'ssh2-sftp-client'
import path from 'path'
import fs from 'fs'

/**
 * SFTP Delivery Service
 * Uploads generated .pk9 files to the SysBot distribute folder
 * on the client's Windows machine via Tailscale + SSH key auth.
 */

const SFTP_CONFIG = {
  host: process.env.BOT_SFTP_HOST || '100.90.194.72',
  port: 22,
  username: process.env.BOT_SFTP_USER || 'pkdexssh',
  privateKey: fs.readFileSync(
    process.env.BOT_SSH_KEY_PATH || `${process.env.HOME}/.ssh/pkdex_sysbot`
  ),
  readyTimeout: 10000, // Abort connection attempt after 10 seconds
}

const REMOTE_DISTRIBUTE_PATH = process.env.BOT_DISTRIBUTE_PATH || 
  '/C:/Users/bestt/Desktop/Sysbot/distribute'

/**
 * Uploads a .pk9 file to the SysBot distribute folder.
 * 
 * @param localFilePath - Absolute path to the local .pk9 file
 * @param filename - The name of the file in the distribute folder (e.g. "pikachu_12345.pk9")
 */
export async function deliverPk9File(localFilePath: string, filename: string): Promise<void> {
  const sftp = new SFTPClient()
  const remotePath = `${REMOTE_DISTRIBUTE_PATH}/${filename}`

  try {
    console.log(`[SftpDelivery] Connecting to bot server at ${SFTP_CONFIG.host}...`)
    await sftp.connect(SFTP_CONFIG)
    
    console.log(`[SftpDelivery] Uploading ${filename} to ${remotePath}...`)
    await sftp.put(localFilePath, remotePath)
    
    console.log(`[SftpDelivery] ✅ ${filename} delivered successfully to distribute folder!`)
  } finally {
    try {
      await sftp.end()
    } catch (e: any) {
      // Ignore ECONNRESET on close, as the file was already uploaded successfully
      if (e.code !== 'ECONNRESET') {
        console.error(`[SftpDelivery] Error closing connection:`, e.message)
      }
    }
  }
}
