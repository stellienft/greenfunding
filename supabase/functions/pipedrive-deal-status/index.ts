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
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('pipedrive_api_key')
      .maybeSingle();

    if (!siteSettings?.pipedrive_api_key) {
      return new Response(JSON.stringify({ error: 'Pipedrive API key not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiToken = siteSettings.pipedrive_api_key;

    const { data: quote } = await supabase
      .from('sent_quotes')
      .select('pipedrive_deal_id')
      .eq('id', quoteId)
      .maybeSingle();

    if (!quote?.pipedrive_deal_id) {
      return new Response(JSON.stringify({ error: 'Quote has no linked Pipedrive deal' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dealRes = await fetch(
      `https://api.pipedrive.com/v1/deals/${quote.pipedrive_deal_id}?api_token=${apiToken}`
    );

    if (!dealRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch deal from Pipedrive' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dealData = await dealRes.json();
    const stageId = dealData?.data?.stage_id;
    const dealStatus = dealData?.data?.status;

    let stageName: string | null = null;
    let pipelineName: string | null = null;

    if (stageId) {
      const stageRes = await fetch(
        `https://api.pipedrive.com/v1/stages/${stageId}?api_token=${apiToken}`
      );
      if (stageRes.ok) {
        const stageData = await stageRes.json();
        stageName = stageData?.data?.name || null;
        const pipelineId = stageData?.data?.pipeline_id;
        if (pipelineId) {
          const pipelineRes = await fetch(
            `https://api.pipedrive.com/v1/pipelines/${pipelineId}?api_token=${apiToken}`
          );
          if (pipelineRes.ok) {
            const pipelineData = await pipelineRes.json();
            pipelineName = pipelineData?.data?.name || null;
          }
        }
      }
    }

    await supabase
      .from('sent_quotes')
      .update({
        pipedrive_stage_name: stageName,
        pipedrive_stage_updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    return new Response(
      JSON.stringify({ success: true, stageName, pipelineName, dealStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
