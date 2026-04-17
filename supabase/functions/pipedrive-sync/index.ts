import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatQuoteNumber(n: number): string {
  return `#${String(n).padStart(6, '0')}`;
}

function getRequiredDocKeys(projectCost: number): string[] {
  if (projectCost >= 250000) {
    const docs = ['financials', 'mgt_financials', 'finance_commitment', 'ato_statement', 'business_overview', 'asset_liability'];
    if (projectCost >= 500000) docs.push('aged_debtors');
    if (projectCost >= 1000000) docs.push('cashflow');
    return docs;
  }
  const base = ['directors_licence', 'medicare_card', 'privacy_consent', 'asset_liability'];
  if (projectCost >= 150000) base.splice(2, 0, 'bank_statements');
  return base;
}

function formatDocType(s: string): string {
  const map: Record<string, string> = {
    directors_licence: "Director's Drivers Licence",
    medicare_card: "Director's Medicare Card",
    privacy_consent: 'Privacy Consent',
    asset_liability: 'Asset and Liability Statement',
    bank_statements: '6 Months Business Bank Statements',
    financials: 'FY24 & FY25 Accountant Prepared Financials',
    mgt_financials: 'Mgt YTD Dec 25 Financials',
    finance_commitment: 'Finance Commitment Schedule',
    ato_statement: 'Current ATO Portal Statement',
    business_overview: 'Business Overview and Major Clients',
    aged_debtors: 'Aged Debtors and Creditors',
    cashflow: 'Cashflow Projections',
  };
  return map[s] || s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function calcTypeLabel(t: string): string {
  switch (t) {
    case 'progress_payment_rental': return 'Progress Payment Rental';
    case 'serviced_rental': return 'Serviced Rental';
    default: return 'Rental';
  }
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  const last = parts.pop()!;
  return { first: parts.join(' '), last };
}

async function findOrCreateOrg(apiToken: string, name: string): Promise<number | undefined> {
  const searchRes = await fetch(
    `https://api.pipedrive.com/v1/organizations/search?term=${encodeURIComponent(name)}&exact_match=true&api_token=${apiToken}`
  );
  if (searchRes.ok) {
    const searchJson = await searchRes.json();
    const existing = searchJson?.data?.items?.[0]?.item;
    if (existing?.id) return existing.id;
  }
  const createRes = await fetch(`https://api.pipedrive.com/v1/organizations?api_token=${apiToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const createJson = await createRes.json();
  return createJson?.data?.id;
}

async function findOrCreatePerson(
  apiToken: string,
  firstName: string,
  lastName: string,
  email?: string,
  phone?: string,
  orgId?: number
): Promise<number | undefined> {
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (!fullName) return undefined;

  const personPayload: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    name: fullName,
  };
  if (email) personPayload.email = [{ value: email, primary: true, label: 'work' }];
  if (phone) personPayload.phone = [{ value: phone, primary: true, label: 'work' }];
  if (orgId) personPayload.org_id = orgId;

  const createRes = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${apiToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personPayload),
  });
  const createJson = await createRes.json();
  return createJson?.data?.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { quoteId, existingDealId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: siteSettings, error: settingsError } = await supabase
      .from('site_settings')
      .select('pipedrive_api_key, pipedrive_pipeline_id, pipedrive_stage_id')
      .maybeSingle();

    if (settingsError || !siteSettings?.pipedrive_api_key) {
      return new Response(JSON.stringify({ error: 'Pipedrive API key is not configured in Site Settings' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiToken = siteSettings.pipedrive_api_key;
    const configuredPipelineId = siteSettings.pipedrive_pipeline_id;
    const configuredStageId = siteSettings.pipedrive_stage_id;

    const { data: quote, error: quoteError } = await supabase
      .from('sent_quotes')
      .select('id, quote_number, recipient_name, recipient_company, recipient_email, client_phone, client_person_name, entity_name, site_address, system_size, project_cost, term_options, asset_names, calculator_type, payment_timing, accepted_at, installer_id')
      .eq('id', quoteId)
      .maybeSingle();

    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: uploads } = await supabase
      .from('quote_document_uploads')
      .select('document_type, file_name, uploaded_at')
      .eq('quote_id', quoteId)
      .order('uploaded_at', { ascending: true });

    const uploadList = uploads || [];

    let installerInfo: { full_name: string | null; company_name: string | null; email: string | null; phone: string | null } | null = null;
    if (quote.installer_id) {
      const { data: installer } = await supabase
        .from('installer_users')
        .select('full_name, company_name, email, phone')
        .eq('id', quote.installer_id)
        .maybeSingle();
      installerInfo = installer;
    }

    const quoteNum = formatQuoteNumber(quote.quote_number);
    const clientDisplayName = quote.entity_name || quote.recipient_company || quote.recipient_name || 'Unknown Client';

    const lowestTerm = quote.term_options?.length
      ? quote.term_options.reduce((a: { years: number }, b: { years: number }) => a.years < b.years ? a : b)
      : null;

    let dealId: number;
    let dealUrl: string;

    if (existingDealId) {
      const verifyRes = await fetch(`https://api.pipedrive.com/v1/deals/${existingDealId}?api_token=${apiToken}`);
      if (!verifyRes.ok) {
        return new Response(JSON.stringify({ error: `Could not find Pipedrive deal #${existingDealId}. Please check the deal ID and try again.` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const verifyJson = await verifyRes.json();
      if (!verifyJson?.data?.id) {
        return new Response(JSON.stringify({ error: `Pipedrive deal #${existingDealId} not found.` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      dealId = verifyJson.data.id;
      dealUrl = `https://app.pipedrive.com/deal/${dealId}`;
    } else {
      const dealTitle = `${quoteNum} — ${clientDisplayName}`;

      // --- Client Person ---
      // Use client_person_name if available (entity quote), otherwise recipient_name
      const clientFullName = quote.client_person_name || quote.recipient_name || '';
      const { first: clientFirst, last: clientLast } = clientFullName
        ? splitName(clientFullName)
        : { first: '', last: '' };

      // --- Client Organisation ---
      let clientOrgId: number | undefined;
      const clientOrgName = quote.entity_name || quote.recipient_company || '';
      if (clientOrgName) {
        clientOrgId = await findOrCreateOrg(apiToken, clientOrgName);
      }

      // --- Client Person (linked to client org) ---
      let clientPersonId: number | undefined;
      if (clientFirst || clientLast) {
        clientPersonId = await findOrCreatePerson(
          apiToken,
          clientFirst,
          clientLast,
          quote.recipient_email || undefined,
          quote.client_phone || undefined,
          clientOrgId
        );
      }

      // --- Supplier Organisation (Installer Company) ---
      let supplierOrgId: number | undefined;
      if (installerInfo?.company_name) {
        supplierOrgId = await findOrCreateOrg(apiToken, installerInfo.company_name);
      }

      // --- Supplier Contact (Installer Name, linked to supplier org) ---
      if (installerInfo?.full_name) {
        const { first: instFirst, last: instLast } = splitName(installerInfo.full_name);
        await findOrCreatePerson(
          apiToken,
          instFirst,
          instLast,
          installerInfo.email || undefined,
          installerInfo.phone || undefined,
          supplierOrgId
        );
      }

      // --- Deal ---
      const dealPayload: Record<string, unknown> = {
        title: dealTitle,
        value: quote.project_cost,
        currency: 'AUD',
        status: 'open',
      };
      if (clientPersonId) dealPayload.person_id = clientPersonId;
      if (clientOrgId) dealPayload.org_id = clientOrgId;
      if (configuredPipelineId) dealPayload.pipeline_id = Number(configuredPipelineId);
      if (configuredStageId) dealPayload.stage_id = Number(configuredStageId);

      const dealRes = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${apiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealPayload),
      });

      if (!dealRes.ok) {
        const body = await dealRes.text();
        console.error('Pipedrive deal creation error:', dealRes.status, body);
        return new Response(JSON.stringify({ error: `Pipedrive API error: ${dealRes.status}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const dealJson = await dealRes.json();
      if (!dealJson?.data?.id) {
        return new Response(JSON.stringify({ error: 'Failed to create Pipedrive deal' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      dealId = dealJson.data.id;
      dealUrl = `https://app.pipedrive.com/deal/${dealId}`;
    }

    const requiredKeys = getRequiredDocKeys(quote.project_cost);
    const uploadedKeys = new Set(uploadList.map((u: { document_type: string }) => u.document_type));
    const allDocsComplete = requiredKeys.every(k => uploadedKeys.has(k));

    const noteLines = [
      `Proposal: ${quoteNum}`,
      `Service Type: ${calcTypeLabel(quote.calculator_type)}`,
      `Project Cost: ${formatCurrency(quote.project_cost)}`,
    ];

    if (quote.site_address) noteLines.push(`Site Address: ${quote.site_address}`);
    if (quote.system_size) noteLines.push(`System Size: ${quote.system_size}`);
    if (quote.payment_timing) noteLines.push(`Payment Timing: ${quote.payment_timing}`);
    if (lowestTerm) noteLines.push(`Monthly Payment (from): ${formatCurrency((lowestTerm as { monthlyPayment: number }).monthlyPayment)}/mo`);
    if (quote.asset_names?.length) noteLines.push(`Assets: ${quote.asset_names.join(', ')}`);

    noteLines.push('');

    if (installerInfo) {
      noteLines.push('Supplier:');
      if (installerInfo.company_name) noteLines.push(`  Company: ${installerInfo.company_name}`);
      if (installerInfo.full_name) noteLines.push(`  Contact: ${installerInfo.full_name}`);
      if (installerInfo.email) noteLines.push(`  Email: ${installerInfo.email}`);
      if (installerInfo.phone) noteLines.push(`  Phone: ${installerInfo.phone}`);
      noteLines.push('');
    }

    if (uploadList.length > 0) {
      noteLines.push(`${allDocsComplete ? '✅' : '⏳'} Documents (${uploadList.length}/${requiredKeys.length} uploaded):`);
      uploadList.forEach((u: { document_type: string; file_name: string }) => {
        noteLines.push(`  • ${formatDocType(u.document_type)} (${u.file_name})`);
      });
    } else {
      noteLines.push('No documents uploaded yet.');
    }

    noteLines.push('');
    noteLines.push(`Synced from Green Funding Portal: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}`);

    await fetch(`https://api.pipedrive.com/v1/notes?api_token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: noteLines.join('\n'),
        deal_id: dealId,
      }),
    });

    let stageName: string | null = null;
    try {
      const dealDetailRes = await fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${apiToken}`);
      if (dealDetailRes.ok) {
        const dealDetail = await dealDetailRes.json();
        const stageId = dealDetail?.data?.stage_id;
        if (stageId) {
          const stageRes = await fetch(`https://api.pipedrive.com/v1/stages/${stageId}?api_token=${apiToken}`);
          if (stageRes.ok) {
            const stageData = await stageRes.json();
            stageName = stageData?.data?.name || null;
          }
        }
      }
    } catch (_) {}

    await supabase
      .from('sent_quotes')
      .update({
        pipedrive_synced_at: new Date().toISOString(),
        pipedrive_deal_id: String(dealId),
        pipedrive_deal_url: dealUrl,
        ...(stageName ? { pipedrive_stage_name: stageName, pipedrive_stage_updated_at: new Date().toISOString() } : {}),
      })
      .eq('id', quoteId);

    return new Response(JSON.stringify({ success: true, dealId, dealUrl, stageName }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('pipedrive-sync error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
