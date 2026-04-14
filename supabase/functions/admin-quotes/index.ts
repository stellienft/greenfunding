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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    if (action === "accepted") {
      const { data: quotes, error: quotesError } = await supabase
        .from("sent_quotes")
        .select("id, quote_number, recipient_name, recipient_company, recipient_email, project_cost, accepted_at")
        .not("accepted_at", "is", null)
        .order("accepted_at", { ascending: false });

      if (quotesError) throw quotesError;

      const quotesWithUploads = await Promise.all(
        (quotes || []).map(async (q) => {
          const { data: uploads } = await supabase
            .from("quote_document_uploads")
            .select("id, document_type, file_name, file_path, file_size, uploaded_at")
            .eq("quote_id", q.id)
            .order("uploaded_at", { ascending: true });
          return { ...q, uploads: uploads || [] };
        })
      );

      return new Response(
        JSON.stringify({ quotes: quotesWithUploads }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "uploads") {
      const quoteId = url.searchParams.get("quote_id");
      if (!quoteId) {
        return new Response(JSON.stringify({ error: "quote_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: uploads, error: uploadsError } = await supabase
        .from("quote_document_uploads")
        .select("id, document_type, file_name, uploaded_at")
        .eq("quote_id", quoteId)
        .order("uploaded_at", { ascending: true });
      if (uploadsError) throw uploadsError;
      return new Response(JSON.stringify({ uploads: uploads || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "download-url") {
      const filePath = url.searchParams.get("path");
      if (!filePath) {
        return new Response(JSON.stringify({ error: "path required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.storage
        .from("application-documents")
        .createSignedUrl(filePath, 60 * 60);
      if (error || !data?.signedUrl) {
        return new Response(JSON.stringify({ error: "Failed to generate URL" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ url: data.signedUrl }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [quotesRes, installersRes] = await Promise.all([
      supabase
        .from("sent_quotes")
        .select("id, quote_number, created_at, installer_id, recipient_name, recipient_company, recipient_email, site_address, system_size, project_cost, term_options, asset_names, calculator_type, payment_timing, status, client_phone, pdf_url, accepted_at, upload_token, pipedrive_synced_at, pipedrive_deal_id, pipedrive_deal_url, pipedrive_stage_name, pipedrive_stage_updated_at")
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
