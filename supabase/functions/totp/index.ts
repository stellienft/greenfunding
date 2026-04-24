import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://portal.greenfunding.com.au',
  'https://greenfunding.com.au',
  'https://www.greenfunding.com.au',
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://portal.greenfunding.com.au';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  };
}

async function verifyAdminAuth(req: Request, supabase: ReturnType<typeof createClient>): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { ok: false, status: 401, error: 'Missing authorization token' };

  const { data: { user }, error } = await createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  ).auth.getUser();

  if (error || !user) return { ok: false, status: 401, error: 'Invalid token' };

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('is_super_admin')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!adminUser?.is_super_admin) return { ok: false, status: 403, error: 'Super admin access required' };

  return { ok: true };
}

function base32Encode(buffer: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function generateTOTP(secret: string, counter: number): Promise<string> {
  const key = base32Decode(secret);
  const timeBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
  const hash = new Uint8Array(signature);
  const offset = hash[19] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

async function verifyTOTPCode(secret: string, code: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000 / 30);
  for (let delta = -1; delta <= 1; delta++) {
    const expected = await generateTOTP(secret, now + delta);
    if (expected === code) return true;
  }
  return false;
}

function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function buildOtpAuthUrl(secret: string, email: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString().replace(/\+/g, '%20')}`;
}

function buildQrCodeUrl(otpauthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    const body = await req.json();

    if (action === 'generate') {
      const { userId, userType, email } = body;
      if (!userId || !userType || !email) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const secret = generateSecret();
      const issuer = 'Green Funding Portal';
      const otpauthUrl = buildOtpAuthUrl(secret, email, issuer);
      const qrCodeUrl = buildQrCodeUrl(otpauthUrl);

      const table = userType === 'admin' ? 'admin_users' : 'installer_users';
      await supabase.from(table).update({ totp_secret: secret }).eq('id', userId);

      return new Response(
        JSON.stringify({ secret, qrCodeUrl, otpauthUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'confirm-setup') {
      const { userId, userType, code } = body;
      if (!userId || !userType || !code) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const table = userType === 'admin' ? 'admin_users' : 'installer_users';
      const { data: user, error } = await supabase
        .from(table)
        .select('totp_secret')
        .eq('id', userId)
        .maybeSingle();

      if (error || !user?.totp_secret) {
        return new Response(JSON.stringify({ error: 'No pending 2FA setup found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const valid = await verifyTOTPCode(user.totp_secret, code);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid code. Please try again.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from(table)
        .update({ totp_enabled: true, totp_setup_prompted: true })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const { userId, userType, code } = body;
      if (!userId || !userType || !code) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const table = userType === 'admin' ? 'admin_users' : 'installer_users';
      const { data: user, error } = await supabase
        .from(table)
        .select('totp_secret, totp_enabled')
        .eq('id', userId)
        .maybeSingle();

      if (error || !user?.totp_secret || !user?.totp_enabled) {
        return new Response(JSON.stringify({ error: '2FA is not configured for this account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const valid = await verifyTOTPCode(user.totp_secret, code);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid code. Please try again.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disable') {
      const { userId, userType, code } = body;
      if (!userId || !userType || !code) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const table = userType === 'admin' ? 'admin_users' : 'installer_users';
      const { data: user, error } = await supabase
        .from(table)
        .select('totp_secret, totp_enabled')
        .eq('id', userId)
        .maybeSingle();

      if (error || !user?.totp_secret || !user?.totp_enabled) {
        return new Response(JSON.stringify({ error: '2FA is not enabled for this account' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const valid = await verifyTOTPCode(user.totp_secret, code);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid code. Please confirm with your authenticator app.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from(table)
        .update({ totp_enabled: false, totp_secret: null })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'admin-reset') {
      const authResult = await verifyAdminAuth(req, supabase);
      if (!authResult.ok) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { userId, userType } = body;
      if (!userId || !userType) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const table = userType === 'admin' ? 'admin_users' : 'installer_users';
      await supabase
        .from(table)
        .update({ totp_enabled: false, totp_secret: null, totp_setup_prompted: false })
        .eq('id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'mark-prompted') {
      const { userId, userType } = body;
      if (!userId || !userType) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const table = userType === 'admin' ? 'admin_users' : 'installer_users';
      await supabase.from(table).update({ totp_setup_prompted: true }).eq('id', userId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
