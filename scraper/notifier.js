/**
 * Notifies Discord of newly found opportunities via Webhook
 * Sends a single digest message per source, capped at 5 highlight embeds.
 */
async function notifyDiscord(newRecords, sourceName) {
  if (!newRecords || newRecords.length === 0) return;
  
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Skipping Discord notification: DISCORD_WEBHOOK_URL not set.');
    return;
  }

  const count = newRecords.length;
  const highlights = newRecords.slice(0, 5);
  const shown = highlights.length;

  console.log(`\nSending digest notification for ${count} new records (${shown} highlights) from ${sourceName} to Discord...`);

  const embeds = highlights.map(record => {
    let deadlineStr = 'Rolling / Unknown';
    if (record.deadline) {
      deadlineStr = new Date(record.deadline).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });
    }

    const tags = record.domain_tags && record.domain_tags.length > 0 
      ? record.domain_tags.map(t => `\`${t}\``).join(' ') 
      : '*None*';

    return {
      title: `🎯 ${record.title}`,
      url: record.source_url,
      description: record.description ? (record.description.length > 200 ? record.description.slice(0, 197) + '...' : record.description) : 'No description provided.',
      color: 0x5865F2, // Discord Blurple
      fields: [
        {
          name: 'Type',
          value: record.type ? (record.type.charAt(0).toUpperCase() + record.type.slice(1)) : 'Opportunity',
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
        text: `Source: ${sourceName} • Opportunity Hub India`
      },
      timestamp: new Date().toISOString()
    };
  });

  const payload = {
    content: `🚀 **[${sourceName.toUpperCase()}] Ingestion Summary**: Found **${count}** new opportunities.\nShowing top ${shown} highlights. View all at: https://opportunity-hub-india.vercel.app`,
    embeds: embeds
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error(`Discord digest webhook failed: ${res.status} ${res.statusText}`);
    } else {
      console.log(`Successfully sent ${sourceName} digest with ${shown} highlights to Discord.`);
    }
  } catch (err) {
    console.error(`Exception sending digest to Discord webhook:`, err.message);
  }
}
/**
 * Notifies Discord of pipeline errors and significant failure thresholds
 * Must be wrapped in try/catch to prevent nested pipeline failures.
 * Explicit Rule: This should never be called more than once per pipeline run per source.
 */
async function notifyDiscordError(sourceName, errorMsg, stats) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Skipping Discord error notification: DISCORD_WEBHOOK_URL not set.');
    return;
  }

  const payload = {
    content: `🚨 **ALERT: Pipeline Failure in ${sourceName}** @here`,
    embeds: [
      {
        title: `Pipeline Error Details`,
        description: errorMsg,
        color: 0xED4245, // Discord Red
        fields: [
          { name: 'Scraped', value: `${stats.recordsScraped || 0}`, inline: true },
          { name: 'Structured', value: `${stats.recordsStructured || 0}`, inline: true },
          { name: 'Upserted', value: `${stats.recordsUpserted || 0}`, inline: true },
          { name: 'Failed', value: `${stats.recordsFailed || 0}`, inline: true },
          { name: 'Skipped', value: `${stats.recordsSkipped || 0}`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error(`Discord error webhook failed: ${res.status} ${res.statusText}`);
    } else {
      console.log(`Successfully sent error alert to Discord.`);
    }
  } catch (err) {
    // If webhook itself fails, log to console only. Never crash the pipeline reporting.
    console.error(`Exception sending error to Discord webhook:`, err.message);
  }
}

module.exports = { notifyDiscord, notifyDiscordError };
