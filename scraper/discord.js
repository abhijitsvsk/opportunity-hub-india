require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

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

  let supabase = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  }

  let lastMessageId = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('scraper_state')
        .select('value')
        .eq('key', 'discord_last_message_id')
        .maybeSingle();
      if (data && data.value) {
        lastMessageId = data.value;
        console.log(`[Discord] Resuming from cursor discord_last_message_id: ${lastMessageId}`);
      }
    } catch (err) {
      console.warn('[Discord] Could not fetch discord_last_message_id from scraper_state:', err.message);
    }
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  const channelIds = process.env.DISCORD_CHANNEL_IDS.split(',').map(id => id.trim()).filter(Boolean);
  const rawRecords = [];
  let newestMessageId = lastMessageId;

  return new Promise((resolve, reject) => {
    client.once('clientReady', async () => {
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

            const fetchOptions = { limit: 50 };
            if (lastMessageId) {
              fetchOptions.after = lastMessageId;
            }

            let messages;
            try {
              messages = await channel.messages.fetch(fetchOptions);
            } catch (fetchErr) {
              if (lastMessageId) {
                console.warn(`[Discord] Failed fetching with after: ${lastMessageId} (${fetchErr.message}). Retrying latest 50 messages...`);
                messages = await channel.messages.fetch({ limit: 50 });
              } else {
                throw fetchErr;
              }
            }

            console.log(`Found ${messages.size} messages in ${channelId}`);

            for (const [id, msg] of messages) {
              // Track the newest message snowflake
              if (!newestMessageId || BigInt(msg.id) > BigInt(newestMessageId)) {
                newestMessageId = msg.id;
              }

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

        // Persist newest cursor if any new message was observed
        if (supabase && newestMessageId && newestMessageId !== lastMessageId) {
          try {
            const { error: stateErr } = await supabase
              .from('scraper_state')
              .upsert({
                key: 'discord_last_message_id',
                value: newestMessageId,
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' });
            if (!stateErr) {
              console.log(`[Discord] Successfully updated scraper_state cursor to ${newestMessageId}`);
            } else {
              console.warn(`[Discord] Failed to update scraper_state cursor:`, stateErr.message);
            }
          } catch (cursorErr) {
            console.warn('[Discord] Error writing scraper_state cursor:', cursorErr.message);
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
