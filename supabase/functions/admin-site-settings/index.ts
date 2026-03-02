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
      serviced_rental_description
    } = await req.json();

    const { data: settings, error: fetchError } = await supabase
      .from('site_settings')
      .select('id')
      .maybeSingle();

    if (fetchError) throw fetchError;

    const updateData = {
      google_analytics_code,
      google_analytics_enabled,
      serviced_rental_enabled,
      serviced_rental_management_fee_percent,
      serviced_rental_name,
      serviced_rental_description,
      updated_at: new Date().toISOString(),
    };

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

    const { error: calcConfigError } = await supabase
      .from('calculator_config')
      .update({ enabled: serviced_rental_enabled })
      .eq('calculator_type', 'serviced_rental');

    if (calcConfigError) throw calcConfigError;

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
