import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const abn = url.searchParams.get("abn")?.replace(/\s/g, "");

    if (!abn) {
      return new Response(JSON.stringify({ error: "ABN is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^\d{11}$/.test(abn)) {
      return new Response(JSON.stringify({ error: "ABN must be 11 digits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guid = Deno.env.get("ABR_GUID");
    if (!guid) {
      return new Response(
        JSON.stringify({ error: "ABR GUID not configured. Please add ABR_GUID to edge function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const abrUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}&callback=cb`;
    const abrRes = await fetch(abrUrl, {
      headers: { "Accept": "application/javascript" },
    });

    if (!abrRes.ok) {
      throw new Error(`ABR returned ${abrRes.status}`);
    }

    const text = await abrRes.text();
    const jsonMatch = text.match(/^cb\(([\s\S]*)\)$/);
    if (!jsonMatch) {
      throw new Error("Unexpected ABR response format");
    }

    const data = JSON.parse(jsonMatch[1]);

    if (data.Message && data.Message !== "") {
      return new Response(JSON.stringify({ error: data.Message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entityName = data.EntityName || data.BusinessName?.[0]?.OrganisationName || "";
    const registrationDate = data.AbnStatusEffectiveFrom || "";
    const entityTypeCode = data.EntityType?.EntityTypeCode || "";
    const entityTypeDescription = data.EntityType?.EntityDescription || "";
    const abnStatus = data.AbnStatus || "";
    const gstRegistered = data.Gst && data.Gst !== "" ? true : false;
    const state = data.AddressState || "";
    const postcode = data.AddressPostcode || "";

    const result = {
      abn: data.Abn,
      entityName,
      registrationDate,
      entityTypeCode,
      entityTypeDescription,
      abnStatus,
      gstRegistered,
      state,
      postcode,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
