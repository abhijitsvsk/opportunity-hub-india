import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// To actually send emails, you would typically use Resend, Sendgrid, or Supabase's built-in email features if configured.
// For this MVP edge function, we will query the DB for users who need reminders and log the intent to send.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Calculate the target deadline window (e.g., closing in exactly 3 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 3);
    
    // Format dates for Postgres query
    const targetDateStart = targetDate.toISOString();
    const targetDateEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 2. Query opportunities with deadlines in the target window
    const { data: opportunities, error: oppError } = await supabase
      .from('opportunities')
      .select('id, title, deadline')
      .gte('deadline', targetDateStart)
      .lt('deadline', targetDateEnd)
      .eq('is_active', true);

    if (oppError) throw oppError;
    if (!opportunities || opportunities.length === 0) {
      return new Response(JSON.stringify({ message: "No opportunities closing in 3 days." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const oppIds = opportunities.map(o => o.id);

    // 3. Find users who have SAVED these opportunities and haven't already applied
    const { data: savedOpps, error: savedError } = await supabase
      .from('user_saved_opportunities')
      .select('user_id, opportunity_id, status, user_profiles(user_id)') // In a real app we'd join auth.users to get email
      .in('opportunity_id', oppIds)
      .eq('status', 'to_apply'); // Only remind if they haven't applied yet

    if (savedError) throw savedError;

    if (!savedOpps || savedOpps.length === 0) {
      return new Response(JSON.stringify({ message: "No users need reminders for these opportunities." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Group by user and prepare email notifications
    const notificationsByUser = new Map();
    
    for (const saved of savedOpps) {
      const opp = opportunities.find(o => o.id === saved.opportunity_id);
      if (!opp) continue;

      if (!notificationsByUser.has(saved.user_id)) {
        notificationsByUser.set(saved.user_id, []);
      }
      notificationsByUser.get(saved.user_id).push(opp);
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailsSent = 0;

    // Iterate and "send" emails
    for (const [userId, opps] of notificationsByUser.entries()) {
      try {
        // Fetch user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) {
          console.error(`Could not fetch email for user ${userId}`);
          continue;
        }

        const email = userData.user.email;
        const htmlContent = `
          <h2>Action Required: Opportunities closing in 3 days!</h2>
          <p>Hi there,</p>
          <p>The following opportunities you saved are closing very soon:</p>
          <ul>
            ${opps.map((o: any) => `<li><strong>${o.title}</strong> - Closes on ${new Date(o.deadline).toLocaleDateString()}</li>`).join('')}
          </ul>
          <p>Good luck!</p>
          <p>— The Opportunity Hub Team</p>
        `;

        if (!resendApiKey) {
          throw new Error('RESEND_API_KEY is missing. Cannot send emails.');
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'Opportunity Hub <notifications@opportunityhub.com>',
            to: [email],
            subject: `🚨 ${opps.length} Saved Opportunities Closing in 3 Days!`,
            html: htmlContent
          })
        });

        if (!res.ok) {
          console.error(`Resend API error for ${email}:`, await res.text());
        } else {
          console.log(`Sent reminder email to ${email}`);
          emailsSent++;
        }
      } catch (e) {
        console.error(`Error processing user ${userId}:`, e);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed reminders for ${emailsSent} users.`,
      details: {
        opportunitiesClosingSoon: opportunities.length,
        usersNeedingReminders: notificationsByUser.size
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error executing send-reminders function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
