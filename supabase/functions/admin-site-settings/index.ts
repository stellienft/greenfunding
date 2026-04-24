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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      google_analytics_code,
      google_analytics_enabled,
      serviced_rental_enabled,
      serviced_rental_management_fee_percent,
      serviced_rental_name,
      serviced_rental_description,
      intro_email_subject,
      intro_email_body,
      pipedrive_api_key,
      pipedrive_deal_id,
      pipedrive_pipeline_id,
      pipedrive_stage_id,
      site_title,
      meta_description,
      og_image_url,
      resend_api_key,
    } = await req.json();

    const { data: settings, error: fetchError } = await supabase
      .from('site_settings')
      .select('id')
      .maybeSingle();

    if (fetchError) throw fetchError;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (google_analytics_code !== undefined) updateData.google_analytics_code = google_analytics_code;
    if (google_analytics_enabled !== undefined) updateData.google_analytics_enabled = google_analytics_enabled;
    if (serviced_rental_enabled !== undefined) updateData.serviced_rental_enabled = serviced_rental_enabled;
    if (serviced_rental_management_fee_percent !== undefined) updateData.serviced_rental_management_fee_percent = serviced_rental_management_fee_percent;
    if (serviced_rental_name !== undefined) updateData.serviced_rental_name = serviced_rental_name;
    if (serviced_rental_description !== undefined) updateData.serviced_rental_description = serviced_rental_description;
    if (intro_email_subject !== undefined) updateData.intro_email_subject = intro_email_subject;
    if (intro_email_body !== undefined) updateData.intro_email_body = intro_email_body;
    if (pipedrive_api_key !== undefined) updateData.pipedrive_api_key = pipedrive_api_key;
    if (pipedrive_deal_id !== undefined) updateData.pipedrive_deal_id = pipedrive_deal_id;
    if (pipedrive_pipeline_id !== undefined) updateData.pipedrive_pipeline_id = pipedrive_pipeline_id;
    if (pipedrive_stage_id !== undefined) updateData.pipedrive_stage_id = pipedrive_stage_id;
    if (site_title !== undefined) updateData.site_title = site_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (og_image_url !== undefined) updateData.og_image_url = og_image_url;
    if (resend_api_key !== undefined) updateData.resend_api_key = resend_api_key;

    if (settings) {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', settings.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('site_settings')
        .insert(updateData);

      if (insertError) throw insertError;
    }

    if (serviced_rental_enabled !== undefined) {
      const { error: calcConfigError } = await supabase
        .from('calculator_config')
        .update({ enabled: serviced_rental_enabled })
        .eq('calculator_type', 'serviced_rental');

      if (calcConfigError) throw calcConfigError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Settings updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
