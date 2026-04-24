const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stateAbbr: Record<string, string> = {
  "New South Wales": "NSW",
  "Victoria": "VIC",
  "Queensland": "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  "Tasmania": "TAS",
  "Australian Capital Territory": "ACT",
  "Northern Territory": "NT",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");

    if (!q || q.trim().length < 3) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Photon (Komoot) — returns proper suburb/city names for Australian addresses
    const params = new URLSearchParams({
      q: q.trim(),
      limit: "10",
      lang: "en",
      bbox: "113.338953078,-43.6345972634,153.569469029,-10.6681857235", // Australia bounding box
    });

    const res = await fetch(
      `https://photon.komoot.io/api/?${params}`,
      {
        headers: {
          "User-Agent": "GreenFundingPortal/1.0 (solutions@greenfunding.com.au)",
        },
      }
    );

    if (!res.ok) {
      console.error("Photon error:", res.status);
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const features = data.features || [];

    const seen = new Set<string>();
    const results: string[] = features
      .filter((f: any) => {
        const props = f.properties || {};
        // Only Australian results
        return props.country === "Australia";
      })
      .map((f: any) => {
        const p = f.properties || {};
        const parts: string[] = [];

        // Street address
        if (p.housenumber && p.street) {
          parts.push(`${p.housenumber} ${p.street}`);
        } else if (p.street) {
          parts.push(p.street);
        } else if (p.name && p.name !== p.city && p.name !== p.state) {
          parts.push(p.name);
        }

        // Suburb / locality — Photon uses 'city' for the actual suburb in AU
        if (p.city) parts.push(p.city);
        // Sometimes district is the suburb when city is a broader area
        if (p.district && p.district !== p.city) parts.push(p.district);

        // State
        if (p.state) parts.push(stateAbbr[p.state] || p.state);

        // Postcode
        if (p.postcode) parts.push(p.postcode);

        if (parts.length < 2) return null;
        return parts.join(", ");
      })
      .filter((s: string | null) => {
        if (!s) return false;
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("address-lookup error:", err);
    return new Response(JSON.stringify({ results: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
