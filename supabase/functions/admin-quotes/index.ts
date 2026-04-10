import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: "public" },
      auth: { persistSession: false },
    });

    const [quotesRes, installersRes] = await Promise.all([
      supabase
        .from("sent_quotes")
        .select("id, quote_number, created_at, installer_id, recipient_name, recipient_company, recipient_email, site_address, system_size, project_cost, term_options, asset_names, calculator_type, payment_timing, status, client_phone")
        .order("created_at", { ascending: false }),
      supabase
        .from("installer_users")
        .select("id, full_name, company_name, email, created_at, quote_count, application_count, user_type"),
    ]);

    if (quotesRes.error) throw quotesRes.error;
    if (installersRes.error) throw installersRes.error;

    return new Response(
      JSON.stringify({ quotes: quotesRes.data, installers: installersRes.data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-quotes function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
