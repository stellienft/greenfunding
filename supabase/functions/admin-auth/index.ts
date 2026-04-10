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
          admin: { id: admin.id, email: admin.email, needs_password_reset: admin.needs_password_reset },
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
        .update({ password_hash: passwordHash })
        .eq('id', adminId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
