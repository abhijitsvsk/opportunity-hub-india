require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

/**
 * Scrapes recent messages from specified Discord channels.
 * Expects DISCORD_BOT_TOKEN and DISCORD_CHANNEL_IDS in .env.
 * Returns an array of raw records to be processed by Gemini.
 */
async function scrapeDiscord() {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.log('DISCORD_BOT_TOKEN not found. Skipping Discord scrape.');
    return [];
  }
  if (!process.env.DISCORD_CHANNEL_IDS) {
    console.log('DISCORD_CHANNEL_IDS not found. Skipping Discord scrape.');
    return [];
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  const channelIds = process.env.DISCORD_CHANNEL_IDS.split(',').map(id => id.trim()).filter(Boolean);
  const rawRecords = [];

  return new Promise((resolve, reject) => {
    client.once('ready', async () => {
      console.log(`Logged in to Discord as ${client.user.tag}!`);

      try {
        for (const channelId of channelIds) {
          console.log(`Fetching messages for channel ${channelId}...`);
          try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
              console.error(`Channel ${channelId} not found.`);
              continue;
            }

            // Fetch the last 50 messages
            const messages = await channel.messages.fetch({ limit: 50 });
            console.log(`Found ${messages.size} messages in ${channelId}`);

            for (const [id, msg] of messages) {
              // Ignore own messages
              if (msg.author.bot && msg.author.id === client.user.id) continue;
              if (!msg.content && msg.embeds.length === 0) continue;

              let rawText = msg.content || '';
              for (const embed of msg.embeds) {
                if (embed.title) rawText += `\nTitle: ${embed.title}`;
                if (embed.description) rawText += `\n${embed.description}`;
              }

              // Skip very short messages (likely just chat or system messages)
              if (rawText.length < 50) continue;

              rawRecords.push({
                source_url: msg.url,
                raw_text: rawText,
                deadline_confidence: 'none',
              });
            }
          } catch (err) {
            console.error(`Error processing channel ${channelId}:`, err.message);
          }
        }
      } catch (err) {
        console.error('Fatal error during Discord scrape:', err.message);
      } finally {
        client.destroy();
        resolve(rawRecords);
      }
    });

    client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
      console.error('Failed to login to Discord:', err.message);
      resolve([]); // Resolve with empty array instead of rejecting so pipeline can continue
    });
  });
}

module.exports = { scrapeDiscord };
