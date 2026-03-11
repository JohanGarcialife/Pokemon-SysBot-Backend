import { Client } from 'discord.js-selfbot-v13';

class DiscordBridgeService {
  private client: Client;
  private isConnected: boolean = false;
  private targetChannelId: string | null = null;

  constructor() {
    this.client = new Client({});

    this.client.on('ready', () => {
      console.log(`[DiscordBridge] Logged in as human user: ${this.client.user?.tag}!`);
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('[DiscordBridge] Connection error:', error);
    });
  }

  public async connect(token: string, targetChannelId: string) {
    this.targetChannelId = targetChannelId;
    if (this.isConnected) return;
    
    try {
      console.log('[DiscordBridge] Connecting with token...');
      await this.client.login(token);
    } catch (error) {
      console.error('[DiscordBridge] Failed to login:', error);
      this.isConnected = false;
    }
  }

  public async sendTradeCommand(showdownText: string, tradeCode: string): Promise<boolean> {
    if (!this.isConnected || !this.targetChannelId) {
      console.error('[DiscordBridge] Cannot send command: Not connected or no target channel specified.');
      return false;
    }

    try {
      const channel = await this.client.channels.fetch(this.targetChannelId);
      if (channel && channel.isText()) {
         // Formatear el comando como le gusta al WebSysBot del cliente (!trade [code])
        const formattedCode = tradeCode.replace(' ', ''); // Quitar espacios si los hay (e.g. "1234 5678" -> "12345678")
        const commandText = `!trade ${formattedCode}\n${showdownText}`;
        console.log(`[DiscordBridge] Sending trade command to channel ${this.targetChannelId}...`);
        await channel.send(commandText);
        console.log(`[DiscordBridge] Command sent successfully!`);
        return true;
      } else {
        console.error(`[DiscordBridge] Channel ${this.targetChannelId} not found or is not a text channel.`);
        return false;
      }
    } catch (error) {
      console.error('[DiscordBridge] Error sending command:', error);
      return false;
    }
  }

  public disconnect() {
    if (this.isConnected) {
      this.client.destroy();
      this.isConnected = false;
      console.log('[DiscordBridge] Disconnected.');
    }
  }
}

export const discordBridge = new DiscordBridgeService();
