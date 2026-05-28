/**
 * Notifies Discord of newly found opportunities via Webhook
 */
async function notifyDiscord(newRecords, sourceName) {
  if (newRecords.length === 0) return;
  
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Skipping Discord notification: DISCORD_WEBHOOK_URL not set.');
    return;
  }

  console.log(`\nSending ${newRecords.length} new records to Discord...`);

  // Discord allows a maximum of 10 embeds per message
  const batchSize = 10;
  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);
    
    const embeds = batch.map(record => {
      // Create a nice human-readable deadline
      let deadlineStr = 'Unknown';
      if (record.deadline) {
        deadlineStr = new Date(record.deadline).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
      }

      // Format tags as inline code blocks
      const tags = record.domain_tags && record.domain_tags.length > 0 
        ? record.domain_tags.map(t => `\`${t}\``).join(' ') 
        : '*None*';

      return {
        title: `🚀 ${record.title}`,
        url: record.source_url,
        description: record.description || 'No description provided.',
        color: 0x5865F2, // Discord Blurple
        fields: [
          {
            name: 'Type',
            value: record.type.charAt(0).toUpperCase() + record.type.slice(1),
            inline: true
          },
          {
            name: 'Deadline',
            value: deadlineStr,
            inline: true
          },
          {
            name: 'Tags',
            value: tags,
            inline: false
          }
        ],
        footer: {
          text: `Source: ${sourceName}`
        },
        timestamp: new Date().toISOString()
      };
    });

    const payload = {
      content: i === 0 ? `Hey @here, found **${newRecords.length}** new opportunities from ${sourceName}!` : '',
      embeds: embeds
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
      } else {
        console.log(`Successfully sent batch of ${batch.length} to Discord.`);
      }
    } catch (err) {
      console.error(`Exception sending to Discord webhook:`, err.message);
    }
    
    // Wait slightly between batches to avoid Discord rate limits
    if (i + batchSize < newRecords.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { notifyDiscord };
