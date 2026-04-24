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
    const url = new URL(req.url);
    const q = url.searchParams.get("q");

    if (!q || q.trim().length < 3) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      format: "json",
      countrycodes: "au",
      limit: "10",
      addressdetails: "1",
      dedupe: "1",
      "accept-language": "en",
      q: q.trim(),
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "GreenFundingPortal/1.0 (solutions@greenfunding.com.au)",
          "Accept-Language": "en",
          "Referer": "https://portal.greenfunding.com.au",
        },
      }
    );

    if (!res.ok) {
      console.error("Nominatim error:", res.status, await res.text());
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

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

    const seen = new Set<string>();
    const results: string[] = data
      .map((d: any) => {
        const a = d.address || {};
        const parts: string[] = [];

        if (a.house_number && a.road) {
          parts.push(`${a.house_number} ${a.road}`);
        } else if (a.road) {
          parts.push(a.road);
        } else if (a.amenity || a.building || a.shop || a.tourism || a.leisure) {
          parts.push(a.amenity || a.building || a.shop || a.tourism || a.leisure);
        }

        const suburb = a.suburb || a.neighbourhood || a.quarter || a.hamlet || a.locality;
        if (suburb) parts.push(suburb);

        const city = a.city || a.town || a.village || a.municipality || a.county;
        if (city && city !== suburb) parts.push(city);

        if (a.state) parts.push(stateAbbr[a.state] || a.state);
        if (a.postcode) parts.push(a.postcode);

        if (parts.length < 2) {
          return d.display_name
            .replace(/,\s*Australia$/, "")
            .replace(/,\s*Australia,/, ",")
            .trim();
        }
        return parts.join(", ");
      })
      .filter((s: string) => {
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
