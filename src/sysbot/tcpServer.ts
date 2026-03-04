import net from 'net'
import { connectionManager } from './ConnectionManager'

export function startTcpServer(port: number) {
  const server = net.createServer((socket) => {
    // Disable Nagle algorithm since SysBot interactions are often tiny strings (e.g. 1-minute heartbeats)
    socket.setNoDelay(true)
    
    // Add raw socket to connection manager, it wraps it in a BotSession
    connectionManager.addConnection(socket)

  })

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(`[TCP Server] Port ${port} is in use, retrying in 1s...`)
      setTimeout(() => {
        server.close()
        server.listen(port)
      }, 1000)
    } else {
      console.error('[TCP Server] Error:', e)
    }
  })

  // Bind to 0.0.0.0 so Tailscale connections from the client's Windows PC can reach us
  server.listen(port, '0.0.0.0', () => {
    console.log(`🤖 SysBot TCP Distribution Server listening on 0.0.0.0:${port}`)
  })

  return server
}
