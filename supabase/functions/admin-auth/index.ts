import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === 'init') {
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'hello@stellio.com.au';
      const adminPassword = Deno.env.get('ADMIN_PASSWORD') || '1234($$)';

      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', adminEmail)
        .maybeSingle();

      if (existingAdmin) {
        return new Response(
          JSON.stringify({ message: 'Admin already exists' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const passwordHash = bcrypt.hashSync(adminPassword, 10);

      const { error } = await supabase
        .from('admin_users')
        .insert({
          email: adminEmail,
          password_hash: passwordHash,
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: 'Admin user created' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'login') {
      const { email, password } = await req.json();

      const { data: admin, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error || !admin) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const valid = bcrypt.compareSync(password, admin.password_hash);

      if (!valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', admin.id);

      return new Response(
        JSON.stringify({
          success: true,
          admin: { id: admin.id, email: admin.email, needs_password_reset: admin.needs_password_reset, is_super_admin: admin.is_super_admin === true },
          requires2fa: admin.totp_enabled === true,
          totp_setup_prompted: admin.totp_setup_prompted === true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'profile') {
      const { adminId } = await req.json();
      if (!adminId) {
        return new Response(JSON.stringify({ error: 'Missing adminId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, first_name, last_name, phone, totp_enabled')
        .eq('id', adminId)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ profile: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-profile') {
      const { adminId, firstName, lastName, phone } = await req.json();
      if (!adminId) {
        return new Response(JSON.stringify({ error: 'Missing adminId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('admin_users')
        .update({ first_name: firstName, last_name: lastName, phone })
        .eq('id', adminId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'change-password') {
      const { adminId, newPassword } = await req.json();

      const passwordHash = bcrypt.hashSync(newPassword, 10);

      const { error } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash, needs_password_reset: false })
        .eq('id', adminId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'request-password-reset') {
      const { adminId } = await req.json();
      if (!adminId) {
        return new Response(JSON.stringify({ error: 'Missing adminId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');
      if (!elasticEmailApiKey) throw new Error('ELASTIC_EMAIL_API_KEY not configured');

      const { data: adminData, error: fetchError } = await supabase
        .from('admin_users')
        .select('email, first_name, last_name')
        .eq('id', adminId)
        .maybeSingle();

      if (fetchError || !adminData) throw new Error('Admin user not found');

      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
      let tempPassword = '';
      for (let i = 0; i < 12; i++) {
        tempPassword += chars[Math.floor(Math.random() * chars.length)];
      }

      const passwordHash = bcrypt.hashSync(tempPassword, 10);

      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ password_hash: passwordHash, needs_password_reset: true })
        .eq('id', adminId);

      if (updateError) throw updateError;

      const displayName = [adminData.first_name, adminData.last_name].filter(Boolean).join(' ') || adminData.email;

      const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.credentials{background:#f9f9f9;padding:15px;border-radius:5px;margin:20px 0}.password{font-size:18px;font-weight:bold;letter-spacing:1px;color:#094325}.important{color:#d32f2f;font-weight:bold}</style></head><body><div class="container"><h2>Password Reset</h2><p>Hi ${displayName},</p><p>A password reset has been requested for your Green Funding Admin Portal account.</p><div class="credentials"><p><strong>Your new temporary password is:</strong></p><p class="password">${tempPassword}</p></div><p class="important">You will be required to create a new password when you first log in.</p><p>Visit <a href="https://portal.greenfunding.com.au/admin">portal.greenfunding.com.au/admin</a> to log in.</p><p>Best regards,<br>Green Funding Support</p></div></body></html>`;

      const plainText = `Hi ${displayName},\n\nA password reset has been requested for your Green Funding Admin Portal account.\nYour new temporary password is: ${tempPassword}\n\nYou will be required to create a new password when you first log in.\nGo to: https://portal.greenfunding.com.au/admin\n\nGreen Funding Support`;

      const emailResponse = await fetch('https://api.elasticemail.com/v4/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ElasticEmail-ApiKey': elasticEmailApiKey },
        body: JSON.stringify({
          Recipients: [{ Email: adminData.email }],
          Content: {
            From: 'noreply@portal.greenfunding.com.au',
            ReplyTo: 'support@greenfundingcalculator.com',
            Subject: 'Green Funding Portal - Your Password Has Been Reset',
            Body: [
              { ContentType: 'HTML', Charset: 'utf-8', Content: emailHtml },
              { ContentType: 'PlainText', Charset: 'utf-8', Content: plainText },
            ],
          },
        }),
      });

      const emailResult = await emailResponse.json();
      if (!emailResponse.ok || (emailResult.Error && emailResult.Error !== '')) {
        throw new Error('Failed to send reset email');
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
