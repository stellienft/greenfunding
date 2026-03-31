import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const {
      google_analytics_code,
      google_analytics_enabled,
      serviced_rental_enabled,
      serviced_rental_management_fee_percent,
      serviced_rental_name,
      serviced_rental_description,
      intro_email_subject,
      intro_email_body,
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
