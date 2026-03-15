import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate: number;
  totalFinanced: number;
}

interface QuotePayload {
  recipientEmail: string;
  recipientName?: string;
  recipientCompany?: string;
  siteAddress?: string;
  systemSize?: string;
  projectCost: number;
  selectedAssetIds: string[];
  termOptions: TermOption[];
  paymentTiming?: string;
  calculatorType?: string;
  installerId?: string;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatQuoteNumber = (num: number): string => {
  return '#' + String(num).padStart(6, '0');
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function generateQuotePdfHtml(
  quoteNumber: string,
  quoteDate: string,
  recipientName: string | undefined,
  recipientCompany: string | undefined,
  siteAddress: string | undefined,
  systemSize: string | undefined,
  projectCost: number,
  assetNames: string[],
  termOptions: TermOption[],
  installerName?: string,
  installerCompany?: string
): string {
  const netCapex = projectCost / 1.1;
  const preparedFor = recipientCompany || recipientName || 'Valued Customer';

  const termRows = termOptions
    .map(
      (t) => `
    <tr>
      <td style="padding: 14px 20px; font-size: 15px; color: #3A475B; border-bottom: 1px solid #E5E7EB;">${t.years} ${t.years === 1 ? 'Year' : 'Years'}</td>
      <td style="padding: 14px 20px; font-size: 15px; font-weight: 700; color: #3A475B; text-align: right; border-bottom: 1px solid #E5E7EB;">${formatCurrency(t.monthlyPayment)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Green Funding Quote ${quoteNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      color: #3A475B;
      background: #fff;
      font-size: 14px;
      line-height: 1.5;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 48px 40px 48px;
      background: #fff;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    .logo-block {}
    .logo-img { height: 48px; width: auto; display: block; }
    .quote-meta-box {
      border: 2px solid #E5E7EB;
      border-radius: 10px;
      padding: 20px 28px;
      text-align: center;
      min-width: 200px;
    }
    .quote-meta-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
      margin-bottom: 6px;
    }
    .quote-meta-value {
      font-size: 24px;
      font-weight: 800;
      color: #3A475B;
      margin-bottom: 14px;
    }
    .quote-meta-divider {
      border: none;
      border-top: 1px solid #E5E7EB;
      margin: 10px 0;
    }
    .from-section {
      margin-bottom: 36px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #28AA48;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid #28AA48;
      display: inline-block;
    }
    .from-details {
      font-size: 14px;
      color: #3A475B;
      line-height: 1.8;
      margin-top: 10px;
    }
    .from-details strong {
      font-weight: 700;
    }
    .prepared-for {
      margin-bottom: 40px;
    }
    .prepared-for h2 {
      font-size: 26px;
      font-weight: 800;
      color: #3A475B;
      margin-top: 10px;
    }
    .summary-heading {
      font-size: 16px;
      font-weight: 700;
      color: #28AA48;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    .summary-card {
      background: linear-gradient(135deg, #4BB543 0%, #28AA48 60%, #AFD235 100%);
      border-radius: 8px;
      padding: 18px 22px;
      margin-bottom: 8px;
    }
    .summary-card p {
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.9;
    }
    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .terms-table thead tr {
      background: #F8FAFB;
    }
    .terms-table th {
      padding: 12px 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
      text-align: left;
      border-bottom: 2px solid #E5E7EB;
    }
    .terms-table th:last-child { text-align: right; }
    .green-footer-bar {
      background: linear-gradient(135deg, #4BB543 0%, #28AA48 60%, #AFD235 100%);
      border-radius: 0 0 8px 8px;
      height: 12px;
      margin-bottom: 28px;
    }
    .disclaimer {
      font-size: 12px;
      color: #6B7280;
      line-height: 1.7;
      margin-bottom: 36px;
    }
    .notes-section {
      margin-bottom: 28px;
    }
    .notes-divider {
      border: none;
      border-top: 1px solid #E5E7EB;
      margin-bottom: 14px;
    }
    .notes-heading {
      font-size: 14px;
      font-weight: 700;
      color: #28AA48;
      margin-bottom: 14px;
    }
    .notes-title {
      font-size: 15px;
      font-weight: 700;
      color: #3A475B;
      margin-bottom: 10px;
    }
    .notes-text {
      font-size: 12px;
      color: #4B5563;
      line-height: 1.7;
      margin-bottom: 12px;
    }
    .page-footer {
      text-align: center;
      font-size: 13px;
      color: #9CA3AF;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="page">

    <div class="header-row">
      <div class="logo-block">
        <img src="https://portal.greenfunding.com.au/image.png" alt="Green Funding" class="logo-img" />
      </div>
      <div class="quote-meta-box">
        <div class="quote-meta-label">Quotation Date</div>
        <div class="quote-meta-value">${quoteDate}</div>
        <hr class="quote-meta-divider"/>
        <div class="quote-meta-label">Quote No:</div>
        <div class="quote-meta-value" style="font-size:20px;">${quoteNumber}</div>
      </div>
    </div>

    <div class="from-section">
      <span class="section-label">FROM</span>
      <div class="from-details">
        <strong>Green Funding</strong><br/>
        Level 18, 324 Queen Street, Brisbane QLD 4000<br/>
        1300 403 100<br/>
        solutions@greenfunding.com.au<br/>
        greenfunding.com.au
      </div>
    </div>

    <div class="prepared-for">
      <span class="section-label">PREPARED FOR</span>
      <h2>${preparedFor}</h2>
    </div>

    <div class="summary-heading">Project Funding Summary</div>

    <div class="summary-card">
      ${siteAddress ? `<p><strong>Location:</strong> ${siteAddress}</p>` : ''}
      ${systemSize ? `<p><strong>System Size:</strong> ${systemSize}</p>` : ''}
      ${assetNames.length > 0 ? `<p><strong>Equipment:</strong> ${assetNames.join(', ')}</p>` : ''}
      <p><strong>Net Capex:</strong> ${formatCurrency(netCapex)} ex GST</p>
    </div>

    <table class="terms-table">
      <thead>
        <tr>
          <th>Term</th>
          <th style="text-align:right;">Monthly Repayment (ex GST)</th>
        </tr>
      </thead>
      <tbody>
        ${termRows}
      </tbody>
    </table>
    <div class="green-footer-bar"></div>

    <div class="disclaimer">
      Discounted payout available after 12 months; only 15% of the present value of all the future interest and capital recovery would be payable.
    </div>

    <div class="notes-section">
      <hr class="notes-divider"/>
      <div class="notes-heading">Notes</div>
      <div class="notes-title">Quote valid for 30 days</div>
      <div class="notes-text">
        This is not an offer for finance. This quote is provided for informational purposes only and does not constitute a
        legally binding offer or agreement. All pricing, system specifications, and financial projections are indicative and
        subject to change following a detailed site inspection, technical assessment, and credit approval.
      </div>
      <div class="notes-text">
        Green Funding is a trading name of Vincent Capital Pty Ltd. Credit Representative Number 545720 of QED Credit Services Pty Ltd | Australian
        Credit Licence Number 387856. All finance is subject to credit provider's lending criteria. Fees, terms, and conditions apply.
      </div>
    </div>

    <div class="page-footer">greenfunding.com.au</div>
  </div>
</body>
</html>`;
}

function generateQuoteEmailHtml(
  quoteNumber: string,
  quoteDate: string,
  recipientName: string | undefined,
  recipientCompany: string | undefined,
  siteAddress: string | undefined,
  systemSize: string | undefined,
  projectCost: number,
  assetNames: string[],
  termOptions: TermOption[],
  installerName?: string
): string {
  const netCapex = projectCost / 1.1;
  const displayName = recipientName || recipientCompany || 'there';
  const preparedFor = recipientCompany || recipientName || 'Valued Customer';

  const termRows = termOptions
    .map(
      (t) => `
      <tr>
        <td style="padding: 14px 20px; font-size: 15px; color: #3A475B; border-bottom: 1px solid #E5E7EB;">${t.years} ${t.years === 1 ? 'Year' : 'Years'}</td>
        <td style="padding: 14px 20px; font-size: 15px; font-weight: 700; color: #3A475B; text-align: right; border-bottom: 1px solid #E5E7EB;">${formatCurrency(t.monthlyPayment)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f5f5f5; padding: 24px; color: #3A475B; line-height: 1.6; }
    .wrapper { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .email-header { background: linear-gradient(135deg, #28AA48 0%, #34AC48 60%, #AFD235 100%); padding: 40px 36px 32px; }
    .logo { margin-bottom: 20px; }
    .logo img { height: 44px; width: auto; display: block; }
    .header-title { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .header-sub { color: rgba(255,255,255,0.9); font-size: 15px; }
    .content { padding: 36px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #3A475B; }
    .intro-text { font-size: 15px; color: #4B5563; margin-bottom: 28px; line-height: 1.7; }
    .quote-card { border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
    .quote-card-header { background: #F8FAFB; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E5E7EB; }
    .quote-card-header .label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; }
    .quote-card-header .value { font-size: 14px; font-weight: 700; color: #3A475B; }
    .summary-block { background: linear-gradient(135deg, #4BB543 0%, #28AA48 60%, #AFD235 100%); padding: 16px 20px; }
    .summary-block p { color: #fff; font-size: 14px; font-weight: 600; line-height: 1.9; }
    .terms-table { width: 100%; border-collapse: collapse; }
    .terms-table th { padding: 10px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; text-align: left; background: #F8FAFB; border-bottom: 1px solid #E5E7EB; }
    .terms-table th:last-child { text-align: right; }
    .disclaimer-box { background: #F8FAFB; border-left: 4px solid #28AA48; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px; font-size: 13px; color: #4B5563; line-height: 1.7; }
    .valid-box { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
    .valid-box strong { color: #065F46; font-size: 14px; display: block; margin-bottom: 4px; }
    .valid-box p { color: #047857; font-size: 13px; }
    .cta-section { text-align: center; margin-bottom: 28px; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #34AC48 0%, #AFD235 100%); color: #fff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-decoration: none; }
    .footer { border-top: 2px solid #E5E7EB; padding: 24px 36px; text-align: center; }
    .footer-company { font-size: 13px; font-weight: 700; color: #3A475B; margin-bottom: 6px; }
    .footer-details { font-size: 12px; color: #9CA3AF; line-height: 1.8; }
    .footer-details a { color: #28AA48; text-decoration: none; }
    .legal-text { font-size: 11px; color: #9CA3AF; line-height: 1.6; margin-top: 12px; }
    @media (max-width: 600px) {
      body { padding: 12px; }
      .email-header { padding: 28px 24px 24px; }
      .content { padding: 24px; }
      .footer { padding: 20px 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="email-header">
      <div class="logo"><img src="https://portal.greenfunding.com.au/image.png" alt="Green Funding" /></div>
      <div class="header-title">Your Financing Quote is Ready</div>
      <div class="header-sub">Quote ${quoteNumber} &bull; ${quoteDate}</div>
    </div>

    <div class="content">
      <div class="greeting">Hi ${displayName},</div>
      <div class="intro-text">
        Thank you for your interest in Green Funding. Please find your personalised project funding quote below.
        A PDF copy of this quote is attached to this email for your records.
      </div>

      <div class="quote-card">
        <div class="quote-card-header">
          <span class="label">Quote Reference</span>
          <span class="value">${quoteNumber}</span>
        </div>
        <div class="quote-card-header" style="border-top: none;">
          <span class="label">Prepared For</span>
          <span class="value">${preparedFor}</span>
        </div>

        <div class="summary-block">
          ${siteAddress ? `<p><strong>Location:</strong> ${siteAddress}</p>` : ''}
          ${systemSize ? `<p><strong>System Size:</strong> ${systemSize}</p>` : ''}
          ${assetNames.length > 0 ? `<p><strong>Equipment:</strong> ${assetNames.join(', ')}</p>` : ''}
          <p><strong>Net Capex:</strong> ${formatCurrency(netCapex)} ex GST</p>
        </div>

        <table class="terms-table">
          <thead>
            <tr>
              <th>Term</th>
              <th style="text-align:right;">Monthly Repayment (ex GST)</th>
            </tr>
          </thead>
          <tbody>
            ${termRows}
          </tbody>
        </table>
      </div>

      <div class="disclaimer-box">
        Discounted payout available after 12 months; only 15% of the present value of all the future interest and capital recovery would be payable.
      </div>

      <div class="valid-box">
        <strong>Quote valid for 30 days</strong>
        <p>This quote is valid until ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}. Please contact us to proceed or to discuss your options.</p>
      </div>

      <div class="cta-section">
        <a href="mailto:solutions@greenfunding.com.au" class="cta-btn">Contact Us to Proceed</a>
      </div>
    </div>

    <div class="footer">
      <div class="footer-company">Green Funding</div>
      <div class="footer-details">
        Level 18, 324 Queen Street, Brisbane QLD 4000<br/>
        <a href="tel:1300403100">1300 403 100</a> &bull;
        <a href="mailto:solutions@greenfunding.com.au">solutions@greenfunding.com.au</a> &bull;
        <a href="https://greenfunding.com.au">greenfunding.com.au</a>
      </div>
      <div class="legal-text">
        This is not an offer for finance. This quote is provided for informational purposes only and does not constitute a legally binding offer or agreement.
        Green Funding is a trading name of Vincent Capital Pty Ltd. Credit Representative Number 545720 of QED Credit Services Pty Ltd | Australian Credit Licence Number 387856.
        All finance is subject to credit provider's lending criteria. Fees, terms, and conditions apply.
      </div>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: QuotePayload = await req.json();

    const {
      recipientEmail,
      recipientName,
      recipientCompany,
      siteAddress,
      systemSize,
      projectCost,
      selectedAssetIds,
      termOptions,
      paymentTiming,
      calculatorType,
      installerId,
    } = payload;

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'recipientEmail is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!termOptions || termOptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'termOptions are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const assetIds = selectedAssetIds || [];
    let assetNames: string[] = [];

    if (assetIds.length > 0) {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, name')
        .in('id', assetIds);

      if (assets) {
        assetNames = assets.map((a: { id: string; name: string }) => a.name);
      }
    }

    let installerName: string | undefined;
    let installerCompany: string | undefined;
    if (installerId) {
      const { data: installer } = await supabase
        .from('installer_users')
        .select('full_name, company_name')
        .eq('id', installerId)
        .maybeSingle();

      if (installer) {
        installerName = installer.full_name;
        installerCompany = installer.company_name;
      }
    }

    const { data: quoteRecord, error: insertError } = await supabase
      .from('sent_quotes')
      .insert({
        installer_id: installerId || null,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        recipient_company: recipientCompany || null,
        site_address: siteAddress || null,
        system_size: systemSize || null,
        project_cost: projectCost,
        selected_asset_ids: assetIds,
        asset_names: assetNames,
        term_options: termOptions,
        payment_timing: paymentTiming || 'arrears',
        calculator_type: calculatorType || 'rental',
      })
      .select('quote_number, created_at')
      .single();

    if (insertError || !quoteRecord) {
      console.error('Failed to create quote record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create quote record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quoteNumber = formatQuoteNumber(quoteRecord.quote_number);
    const quoteDate = formatDate(new Date(quoteRecord.created_at));

    const pdfHtml = generateQuotePdfHtml(
      quoteNumber,
      quoteDate,
      recipientName,
      recipientCompany,
      siteAddress,
      systemSize,
      projectCost,
      assetNames,
      termOptions,
      installerName,
      installerCompany
    );

    const emailHtml = generateQuoteEmailHtml(
      quoteNumber,
      quoteDate,
      recipientName,
      recipientCompany,
      siteAddress,
      systemSize,
      projectCost,
      assetNames,
      termOptions,
      installerName
    );

    const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');

    if (!elasticEmailApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preparedFor = recipientCompany || recipientName || 'Valued Customer';
    const subjectLine = `Your Green Funding Quote ${quoteNumber} - ${preparedFor}`;

    const emailResponse = await fetch('https://api.elasticemail.com/v4/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElasticEmail-ApiKey': elasticEmailApiKey,
      },
      body: JSON.stringify({
        Recipients: [{ Email: recipientEmail }],
        Content: {
          From: 'noreply@portal.greenfunding.com.au',
          ReplyTo: 'solutions@greenfunding.com.au',
          Subject: subjectLine,
          Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: emailHtml }],
          Attachments: [
            {
              BinaryContent: btoa(unescape(encodeURIComponent(pdfHtml))),
              Name: `GreenFunding-Quote-${quoteNumber}.html`,
              ContentType: 'text/html',
            },
          ],
        },
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok || (emailResult.Error && emailResult.Error !== '')) {
      console.error('Elastic Email API error:', emailResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        quoteNumber,
        emailId: emailResult.TransactionID || 'sent',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-quote-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
