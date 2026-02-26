import { Socket } from 'net'
import { v4 as uuidv4 } from 'uuid'
import { BotStatus } from './types'

export class BotSession {
  public readonly id: string
  public status: BotStatus = 'IDLE'
  public gameVersion: string = 'unknown'
  public connectedAt: Date
  
  private socket: Socket
  private dataBuffer: string = ''

  // Custom events
  public onDisconnect?: (id: string) => void
  public onMessage?: (id: string, message: string) => void
  public onAuth?: (id: string, gameVersion: string) => void

  constructor(socket: Socket) {
    this.id = uuidv4()
    this.socket = socket
    this.connectedAt = new Date()

    this.setupListeners()
  }

  private setupListeners() {
    this.socket.setEncoding('utf8')

    this.socket.on('data', (data: Buffer | string) => {
      this.dataBuffer += data.toString()
      this.processBuffer()
    })

    this.socket.on('close', () => {
      this.status = 'DISCONNECTED'
      if (this.onDisconnect) this.onDisconnect(this.id)
    })

    this.socket.on('error', (err) => {
      console.error(`[BotSession ${this.id}] Socket error:`, err)
      // Usually followed by a close event
    })
  }

  /**
   * Reads line by line from the incoming stream.
   * SysBots usually communicate with newline-terminated strings.
   */
  private processBuffer() {
    let newlineIndex: number
    while ((newlineIndex = this.dataBuffer.indexOf('\n')) !== -1) {
      const line = this.dataBuffer.substring(0, newlineIndex).trim()
      this.dataBuffer = this.dataBuffer.substring(newlineIndex + 1)
      
      if (line.length > 0) {
        this.handleLine(line)
      }
    }
  }

  /**
   * Basic protocol router.
   */
  private handleLine(line: string) {
    // Example basic handshake: "HELLO legends-za" or "HELLO scarlet"
    if (line.startsWith('HELLO ')) {
      const game = line.split(' ')[1]
      if (game) {
        this.gameVersion = game
        console.log(`[BotSession ${this.id}] Authenticated as ${game}`)
        if (this.onAuth) this.onAuth(this.id, game)
        this.send('OK HANDSHAKE_ACCEPTED')
      }
      return
    }

    if (this.onMessage) {
      this.onMessage(this.id, line)
    }
  }

  /**
   * Send a raw string command to the bot.
   * Ensures it ends with a newline.
   */
  public send(message: string) {
    if (this.status === 'DISCONNECTED' || this.socket.destroyed) {
      console.warn(`[BotSession ${this.id}] Attempted to send to disconnected socket`)
      return
    }
    
    const payload = message.endsWith('\n') ? message : message + '\n'
    this.socket.write(payload)
  }

  /**
   * Gracefully kick the bot.
   */
  public disconnect() {
    this.socket.end()
  }
}
