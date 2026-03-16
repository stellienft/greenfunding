import { createClient } from 'npm:@supabase/supabase-js@2';
import PdfPrinter from 'npm:pdfmake@0.2.12';

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

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('https://portal.greenfunding.com.au/image.png');
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return 'data:image/png;base64,' + btoa(binary);
  } catch {
    return null;
  }
}

async function generateQuotePdf(
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
): Promise<Uint8Array> {
  const netCapex = projectCost / 1.1;
  const preparedFor = recipientCompany || recipientName || 'Valued Customer';

  const logoBase64 = await fetchLogoBase64();

  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  };

  const GREEN = '#28AA48';
  const DARK = '#3A475B';
  const GRAY = '#6B7280';
  const LIGHT_BG = '#F8FAFB';
  const BORDER_COLOR = '#E5E7EB';
  const GREEN_LIGHT = '#E8F5E9';

  const summaryRows: object[] = [];
  if (siteAddress) {
    summaryRows.push({
      columns: [
        { text: 'Location:', bold: true, fontSize: 10, color: DARK, width: 100 },
        { text: siteAddress, fontSize: 10, color: DARK },
      ],
      margin: [0, 4, 0, 0],
    });
  }
  if (systemSize) {
    summaryRows.push({
      columns: [
        { text: 'System Size:', bold: true, fontSize: 10, color: DARK, width: 100 },
        { text: systemSize, fontSize: 10, color: DARK },
      ],
      margin: [0, 4, 0, 0],
    });
  }
  if (assetNames.length > 0) {
    summaryRows.push({
      columns: [
        { text: 'Equipment:', bold: true, fontSize: 10, color: DARK, width: 100 },
        { text: assetNames.join(', '), fontSize: 10, color: DARK },
      ],
      margin: [0, 4, 0, 0],
    });
  }
  summaryRows.push({
    columns: [
      { text: 'Net Capex:', bold: true, fontSize: 10, color: DARK, width: 100 },
      { text: `${formatCurrency(netCapex)} ex GST`, fontSize: 10, color: DARK },
    ],
    margin: [0, 4, 0, 0],
  });

  const termTableBody: object[][] = [
    [
      { text: 'TERM', style: 'tableHeader', alignment: 'left' },
      { text: 'MONTHLY REPAYMENT (EX GST)', style: 'tableHeader', alignment: 'right' },
    ],
  ];
  termOptions.forEach((t) => {
    termTableBody.push([
      { text: `${t.years} ${t.years === 1 ? 'Year' : 'Years'}`, fontSize: 12, color: DARK, margin: [0, 8, 0, 8] },
      { text: formatCurrency(t.monthlyPayment), fontSize: 12, bold: true, color: DARK, alignment: 'right', margin: [0, 8, 0, 8] },
    ]);
  });

  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 11,
      color: DARK,
      lineHeight: 1.4,
    },
    content: [
      {
        columns: [
          {
            stack: logoBase64
              ? [{ image: logoBase64, fit: [200, 60], margin: [0, 0, 0, 0] }]
              : [{ text: 'Green Funding', fontSize: 26, bold: true, color: DARK }],
          },
          {
            stack: [
              {
                text: 'QUOTATION DATE',
                fontSize: 8,
                bold: true,
                color: GRAY,
                alignment: 'right',
                characterSpacing: 1,
              },
              {
                text: quoteDate,
                fontSize: 18,
                bold: true,
                color: DARK,
                alignment: 'right',
                margin: [0, 2, 0, 8],
              },
              {
                text: 'QUOTE NO',
                fontSize: 8,
                bold: true,
                color: GRAY,
                alignment: 'right',
                characterSpacing: 1,
              },
              {
                text: quoteNumber,
                fontSize: 16,
                bold: true,
                color: DARK,
                alignment: 'right',
                margin: [0, 2, 0, 0],
              },
            ],
            width: 180,
          },
        ],
        margin: [0, 0, 0, 24],
      },

      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: BORDER_COLOR }],
        margin: [0, 0, 0, 20],
      },

      {
        columns: [
          {
            stack: [
              { text: 'FROM', fontSize: 9, bold: true, color: GREEN, characterSpacing: 1.5, margin: [0, 0, 0, 6] },
              { text: 'Green Funding', bold: true, fontSize: 11, color: DARK },
              { text: 'Level 18, 324 Queen Street', fontSize: 10, color: GRAY },
              { text: 'Brisbane QLD 4000', fontSize: 10, color: GRAY },
              { text: '1300 403 100', fontSize: 10, color: GRAY },
              { text: 'solutions@greenfunding.com.au', fontSize: 10, color: GREEN },
            ],
          },
          {
            stack: [
              { text: 'PREPARED FOR', fontSize: 9, bold: true, color: GREEN, characterSpacing: 1.5, margin: [0, 0, 0, 6] },
              { text: preparedFor, bold: true, fontSize: 18, color: DARK },
            ],
          },
        ],
        margin: [0, 0, 0, 28],
      },

      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER_COLOR }],
        margin: [0, 0, 0, 20],
      },

      { text: 'Project Funding Summary', fontSize: 14, bold: true, color: GREEN, margin: [0, 0, 0, 12] },

      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: summaryRows,
                fillColor: GREEN_LIGHT,
                margin: [12, 12, 12, 12],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 16],
      },

      {
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: termTableBody,
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: object[][] } }) => {
            return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
          fillColor: (rowIndex: number) => (rowIndex === 0 ? LIGHT_BG : null),
          paddingLeft: () => 12,
          paddingRight: () => 12,
        },
        margin: [0, 0, 0, 8],
      },

      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 6, r: 3, color: GREEN }],
        margin: [0, 0, 0, 24],
      },

      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: 'Discounted payout available after 12 months; the payout would include the present value of the remaining capital recovery and only 15% of the present value of the remaining interest.',
                fontSize: 10,
                color: '#4B5563',
                margin: [12, 10, 12, 10],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i: number) => (i === 0 ? 3 : 0),
          vLineColor: () => GREEN,
          fillColor: () => LIGHT_BG,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 20],
      },

      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER_COLOR }],
        margin: [0, 0, 0, 16],
      },

      { text: 'Notes', fontSize: 12, bold: true, color: GREEN, margin: [0, 0, 0, 10] },
      { text: `Quote valid for 30 days (until ${validUntil})`, fontSize: 11, bold: true, color: DARK, margin: [0, 0, 0, 8] },
      {
        text: 'This is not an offer for finance. This quote is provided for informational purposes only and does not constitute a legally binding offer or agreement. All pricing, system specifications, and financial projections are indicative and subject to change following a detailed site inspection, technical assessment, and credit approval.',
        fontSize: 9,
        color: '#4B5563',
        lineHeight: 1.6,
        margin: [0, 0, 0, 8],
      },
      {
        text: 'Green Funding is a trading name of Vincent Capital Pty Ltd. Credit Representative Number 545720 of QED Credit Services Pty Ltd | Australian Credit Licence Number 387856. All finance is subject to credit provider\'s lending criteria. Fees, terms, and conditions apply.',
        fontSize: 9,
        color: '#4B5563',
        lineHeight: 1.6,
      },
    ],

    footer: () => ({
      columns: [
        { text: 'greenfunding.com.au', fontSize: 9, color: GRAY, alignment: 'center' },
      ],
      margin: [40, 0, 40, 20],
    }),

    styles: {
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: GRAY,
        characterSpacing: 0.5,
      },
    },
  };

  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(result);
    });
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
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
        <td style="padding: 14px 20px; font-size: 15px; color: #3A475B; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif;">${t.years} ${t.years === 1 ? 'Year' : 'Years'}</td>
        <td style="padding: 14px 20px; font-size: 15px; font-weight: 700; color: #3A475B; text-align: right; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif;">${formatCurrency(t.monthlyPayment)}</td>
      </tr>`
    )
    .join('');

  const summaryRows = [
    siteAddress ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Location:</strong> ${siteAddress}</td></tr>` : '',
    systemSize ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>System Size:</strong> ${systemSize}</td></tr>` : '',
    assetNames.length > 0 ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Equipment:</strong> ${assetNames.join(', ')}</td></tr>` : '',
    `<tr><td style="padding: 8px 20px 16px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Net Capex:</strong> ${formatCurrency(netCapex)} ex GST</td></tr>`,
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 24px; background-color: #f5f5f5; font-family: Arial, sans-serif; color: #3A475B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 36px 36px 28px 36px; border-bottom: 2px solid #E5E7EB;">
              <img src="https://portal.greenfunding.com.au/image.png" alt="Green Funding" height="44" style="display: block; margin-bottom: 20px;" />
              <p style="color: #3A475B; font-size: 22px; font-weight: 700; margin: 0 0 6px 0; font-family: Arial, sans-serif;">Your Financing Quote is Ready</p>
              <p style="color: #6B7280; font-size: 15px; margin: 0; font-family: Arial, sans-serif;">Quote ${quoteNumber} &bull; ${quoteDate}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px;">

              <p style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #3A475B; font-family: Arial, sans-serif;">Hi ${displayName},</p>
              <p style="font-size: 15px; color: #4B5563; margin: 0 0 28px 0; line-height: 1.7; font-family: Arial, sans-serif;">
                Thank you for your interest in Green Funding. Please find your personalised project funding quote below.
                A PDF copy of this quote is attached to this email for your records.
              </p>

              <!-- Quote Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 2px solid #E5E7EB; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #F8FAFB; padding: 14px 20px; border-bottom: 2px solid #E5E7EB;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; font-family: Arial, sans-serif;">Quote Reference</td>
                        <td style="font-size: 14px; font-weight: 700; color: #3A475B; text-align: right; font-family: Arial, sans-serif;">${quoteNumber}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8FAFB; padding: 14px 20px; border-bottom: 2px solid #E5E7EB;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; font-family: Arial, sans-serif;">Prepared For</td>
                        <td style="font-size: 14px; font-weight: 700; color: #3A475B; text-align: right; font-family: Arial, sans-serif;">${preparedFor}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Summary Block -->
                <tr>
                  <td style="background-color: #E8F5E9; border-bottom: 2px solid #E5E7EB; padding-top: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${summaryRows}
                    </table>
                  </td>
                </tr>

                <!-- Terms Table -->
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <thead>
                        <tr>
                          <th style="padding: 10px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; text-align: left; background-color: #F8FAFB; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif;">Term</th>
                          <th style="padding: 10px 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; text-align: right; background-color: #F8FAFB; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif;">Monthly Repayment (ex GST)</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${termRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #F8FAFB; border-left: 4px solid #28AA48; padding: 16px 20px; font-size: 13px; color: #4B5563; line-height: 1.7; font-family: Arial, sans-serif;">
                    Discounted payout available after 12 months; the payout would include the present value of the remaining capital recovery and only 15% of the present value of the remaining interest.
                  </td>
                </tr>
              </table>

              <!-- Valid Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px 20px;">
                    <p style="color: #065F46; font-size: 14px; font-weight: 700; margin: 0 0 4px 0; font-family: Arial, sans-serif;">Quote valid for 30 days</p>
                    <p style="color: #047857; font-size: 13px; margin: 0; font-family: Arial, sans-serif;">This quote is valid until ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}. Please contact us to proceed or to discuss your options.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="mailto:solutions@greenfunding.com.au" style="display: inline-block; background-color: #28AA48; color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-family: Arial, sans-serif;">Contact Us to Proceed</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 2px solid #E5E7EB; padding: 24px 36px; text-align: center;">
              <p style="font-size: 13px; font-weight: 700; color: #3A475B; margin: 0 0 6px 0; font-family: Arial, sans-serif;">Green Funding</p>
              <p style="font-size: 12px; color: #9CA3AF; line-height: 1.8; margin: 0 0 12px 0; font-family: Arial, sans-serif;">
                Level 18, 324 Queen Street, Brisbane QLD 4000<br/>
                <a href="tel:1300403100" style="color: #28AA48; text-decoration: none;">1300 403 100</a> &bull;
                <a href="mailto:solutions@greenfunding.com.au" style="color: #28AA48; text-decoration: none;">solutions@greenfunding.com.au</a> &bull;
                <a href="https://greenfunding.com.au" style="color: #28AA48; text-decoration: none;">greenfunding.com.au</a>
              </p>
              <p style="font-size: 11px; color: #9CA3AF; line-height: 1.6; margin: 0; font-family: Arial, sans-serif;">
                This is not an offer for finance. This quote is provided for informational purposes only and does not constitute a legally binding offer or agreement.
                Green Funding is a trading name of Vincent Capital Pty Ltd. Credit Representative Number 545720 of QED Credit Services Pty Ltd | Australian Credit Licence Number 387856.
                All finance is subject to credit provider's lending criteria. Fees, terms, and conditions apply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
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

    const [pdfBytes, emailHtml] = await Promise.all([
      generateQuotePdf(
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
      ),
      Promise.resolve(generateQuoteEmailHtml(
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
      )),
    ]);

    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

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
              BinaryContent: pdfBase64,
              Name: `GreenFunding-Quote-${quoteNumber}.pdf`,
              ContentType: 'application/pdf',
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
