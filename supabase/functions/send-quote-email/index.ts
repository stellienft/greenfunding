import { createClient } from 'npm:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'npm:pdf-lib@1.17.1';

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
  recipientEmail?: string;
  recipientName?: string;
  recipientCompany?: string;
  siteAddress?: string;
  systemSize?: string;
  contribution?: string;
  clientPhone?: string;
  projectCost: number;
  selectedAssetIds: string[];
  termOptions: TermOption[];
  paymentTiming?: string;
  calculatorType?: string;
  installerId?: string;
  introEmailSubject?: string;
  introEmailBody?: string;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 0, g: 0, b: 0 };
}

async function generateQuotePdf(
  quoteNumber: string,
  quoteDate: string,
  recipientName: string | undefined,
  recipientCompany: string | undefined,
  siteAddress: string | undefined,
  systemSize: string | undefined,
  contribution: string | undefined,
  projectCost: number,
  assetNames: string[],
  termOptions: TermOption[],
  installerName?: string,
  installerCompany?: string,
  clientPhone?: string,
  _logoBase64?: string | null
): Promise<Uint8Array> {
  const GREEN = hexToRgb('#28AA48');
  const GREEN2 = hexToRgb('#7DC241');
  const DARK = hexToRgb('#1F2937');
  const GRAY = hexToRgb('#6B7280');
  const LIGHT_GRAY = hexToRgb('#9CA3AF');
  const GREEN_BOX_BG = hexToRgb('#3DAA3A');
  const GREEN_BOX_BG2 = hexToRgb('#8DC63F');
  const ROW_ALT = hexToRgb('#F3F4F6');
  const BORDER_COLOR = hexToRgb('#D1D5DB');
  const NOTE_BG = hexToRgb('#3DAA3A');

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const ML = 50;
  const MR = 50;
  const CW = pageWidth - ML - MR;
  const netCapex = projectCost / 1.1;

  const validUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const validUntil = validUntilDate.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const preparedFor = recipientCompany || recipientName || '';

  function wrapText(text: string, font: typeof fontRegular, size: number, maxW: number): string[] {
    const words = String(text ?? '').split(' ');
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawTextWrapped(page: ReturnType<typeof pdfDoc.addPage>, text: string, x: number, py: number, size: number, bold: boolean, color: { r: number; g: number; b: number }, maxW: number, lineH?: number): number {
    const font = bold ? fontBold : fontRegular;
    const lh = lineH ?? size * 1.45;
    const lines = wrapText(text, font, size, maxW);
    let curY = py;
    for (const line of lines) {
      page.drawText(line, { x, y: curY, size, font, color: rgb(color.r, color.g, color.b) });
      curY -= lh;
    }
    return py - curY;
  }

  function drawT(page: ReturnType<typeof pdfDoc.addPage>, text: string, x: number, py: number, size: number, bold: boolean, color: { r: number; g: number; b: number }) {
    const font = bold ? fontBold : fontRegular;
    page.drawText(String(text ?? ''), { x, y: py, size, font, color: rgb(color.r, color.g, color.b) });
  }

  function drawRect(page: ReturnType<typeof pdfDoc.addPage>, x: number, py: number, w: number, h: number, color: { r: number; g: number; b: number }) {
    page.drawRectangle({ x, y: py, width: w, height: h, color: rgb(color.r, color.g, color.b) });
  }

  function drawLine(page: ReturnType<typeof pdfDoc.addPage>, x1: number, py: number, x2: number, color: { r: number; g: number; b: number }, thickness = 0.75) {
    page.drawLine({ start: { x: x1, y: py }, end: { x: x2, y: py }, thickness, color: rgb(color.r, color.g, color.b) });
  }

  function drawBorderedBox(page: ReturnType<typeof pdfDoc.addPage>, x: number, py: number, w: number, h: number) {
    page.drawRectangle({ x, y: py, width: w, height: h, borderColor: rgb(BORDER_COLOR.r, BORDER_COLOR.g, BORDER_COLOR.b), borderWidth: 1, color: rgb(1, 1, 1) });
  }

  function textW(text: string, bold: boolean, size: number) {
    return (bold ? fontBold : fontRegular).widthOfTextAtSize(String(text ?? ''), size);
  }

  function drawPage1() {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 48;

    // === LOGO top-left ===
    // "green" in green, "funding" in dark
    const logoSize = 22;
    drawT(page, 'green', ML, y, logoSize, false, GREEN);
    const greenW = textW('green', false, logoSize);
    drawT(page, ' funding', ML + greenW, y, logoSize, false, DARK);

    // === DATE BOX top-right ===
    const boxW = 150;
    const boxH = 80;
    const boxX = pageWidth - MR - boxW;
    const boxY = y - boxH + 14;
    drawBorderedBox(page, boxX, boxY, boxW, boxH);

    const dateLabel = 'Quotation Date';
    drawT(page, dateLabel, boxX + (boxW - textW(dateLabel, false, 9)) / 2, y, 9, false, DARK);
    drawT(page, quoteDate, boxX + (boxW - textW(quoteDate, true, 16)) / 2, y - 18, 16, true, GREEN);
    const quoteLabel = 'Quote No:';
    drawT(page, quoteLabel, boxX + (boxW - textW(quoteLabel, false, 9)) / 2, y - 36, 9, false, DARK);
    drawT(page, quoteNumber, boxX + (boxW - textW(quoteNumber, true, 15)) / 2, y - 52, 15, true, GREEN);

    y -= 50;

    // === FROM section ===
    drawT(page, 'FROM', ML, y, 9, true, GREEN);
    drawLine(page, ML, y - 3, ML + 45, GREEN, 1.5);
    y -= 18;

    drawT(page, 'Green Funding', ML, y, 10, true, DARK);
    y -= 14;
    drawT(page, 'Level 18, 324 Queen Street, Brisbane QLD 4000', ML, y, 9, false, DARK);
    y -= 13;
    drawT(page, '1300 403 100', ML, y, 9, false, DARK);
    y -= 13;
    drawT(page, 'solutions@greenfunding.com.au', ML, y, 9, false, DARK);
    y -= 13;
    drawT(page, 'greenfunding.com.au', ML, y, 9, false, DARK);
    y -= 22;

    // === PREPARED FOR section ===
    drawT(page, 'PREPARED FOR', ML, y, 9, true, GREEN);
    drawLine(page, ML, y - 3, ML + 70, GREEN, 1.5);
    y -= 20;

    if (preparedFor) {
      drawT(page, preparedFor, ML, y, 16, true, DARK);
      y -= 20;
    }

    if (recipientName && recipientCompany) {
      drawT(page, recipientName, ML, y, 10, false, DARK);
      y -= 13;
    }

    if (siteAddress) {
      drawT(page, siteAddress, ML, y, 9, false, GRAY);
      y -= 13;
    }

    if (clientPhone) {
      drawT(page, clientPhone, ML, y, 9, false, GRAY);
      y -= 13;
    }

    y -= 4;
    drawT(page, 'Project Funding Summary', ML, y, 12, true, DARK);
    y -= 22;

    // === WATERMARK CIRCLES (decorative, light green) ===
    const WATERMARK = { r: 0.16, g: 0.67, b: 0.28 };
    page.drawCircle({ x: pageWidth - 30, y: pageHeight * 0.42, size: 130, color: rgb(WATERMARK.r, WATERMARK.g, WATERMARK.b), opacity: 0.07 });
    page.drawCircle({ x: pageWidth + 20, y: pageHeight * 0.38, size: 90, color: rgb(WATERMARK.r, WATERMARK.g, WATERMARK.b), opacity: 0.05 });
    page.drawCircle({ x: pageWidth - 60, y: pageHeight * 0.28, size: 60, color: rgb(WATERMARK.r, WATERMARK.g, WATERMARK.b), opacity: 0.06 });

    // === GREEN SUMMARY BOX ===
    const summaryLines: string[] = [];
    if (systemSize) summaryLines.push(`System: ${systemSize}`);
    if (contribution) summaryLines.push(`Contribution: ${contribution}`);
    summaryLines.push(`Net Capex: $ ${netCapex.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (ex. GST)`);

    const summaryLineH = 18;
    const summaryPadV = 14;
    const summaryH = summaryLines.length * summaryLineH + summaryPadV * 2 - 4;

    drawRect(page, ML, y - summaryH, CW, summaryH, GREEN_BOX_BG);
    drawRect(page, ML + CW * 0.5, y - summaryH, CW * 0.5, summaryH, GREEN_BOX_BG2);

    let sy = y - summaryPadV - 2;
    for (const line of summaryLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const label = line.substring(0, colonIdx + 1);
        const val = line.substring(colonIdx + 1);
        drawT(page, label, ML + 12, sy, 10, true, { r: 1, g: 1, b: 1 });
        drawT(page, val, ML + 12 + textW(label, true, 10) + 3, sy, 10, false, { r: 1, g: 1, b: 1 });
      } else {
        drawT(page, line, ML + 12, sy, 10, false, { r: 1, g: 1, b: 1 });
      }
      sy -= summaryLineH;
    }
    y -= summaryH + 18;

    // === TERM TABLE ===
    const sortedTermOptions = [...termOptions].sort((a, b) => a.years - b.years);

    const termHeaderH = 28;
    const termHeaderLabel = 'Term';
    const repaymentHeaderLabel = 'Monthly Repayment (ex GST)';
    drawT(page, termHeaderLabel, ML + 8, y - 16, 9, false, GRAY);
    drawT(page, repaymentHeaderLabel, pageWidth - MR - textW(repaymentHeaderLabel, false, 9) - 8, y - 16, 9, false, GRAY);
    y -= termHeaderH;

    drawLine(page, ML, y, ML + CW, BORDER_COLOR);
    y -= 8;

    sortedTermOptions.forEach((t, i) => {
      const rowH = 28;
      if (i % 2 !== 0) {
        drawRect(page, ML, y - rowH + 6, CW, rowH, ROW_ALT);
      }
      drawLine(page, ML, y + 6, ML + CW, BORDER_COLOR, 0.5);
      const termLabel = `${t.years} Year${t.years !== 1 ? 's' : ''}`;
      drawT(page, termLabel, ML + 8, y - 10, 11, false, DARK);
      const amtFormatted = '$ ' + t.monthlyPayment.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      drawT(page, amtFormatted, pageWidth - MR - textW(amtFormatted, true, 11) - 8, y - 10, 11, true, DARK);
      y -= rowH;
    });

    y -= 24;

    // === NOTES SECTION ===
    drawT(page, 'Notes', ML, y, 13, false, GREEN);
    drawLine(page, ML, y - 4, ML + 38, GREEN, 1);
    y -= 22;
    drawT(page, 'Quote valid for 30 days', ML, y, 12, true, DARK);
    y -= 18;

    const d1 = `This is not an offer for finance. This quote is provided for informational purposes only and does not constitute a legally binding offer or agreement. All pricing, system specifications, and financial projections are indicative and subject to change following a detailed site inspection, technical assessment, and credit approval.`;
    const d1H = drawTextWrapped(page, d1, ML, y, 9, false, hexToRgb('#374151'), CW, 14);
    y -= d1H + 14;

    const d2 = `Green Funding is a trading name of Vincent Capital Pty Ltd. Credit Representative Number 545720 of QED Credit Services Pty Ltd | Australian Credit Licence Number 387856. All finance is subject to credit provider's lending criteria. Fees, terms, and conditions apply.`;
    drawTextWrapped(page, d2, ML, y, 8, false, LIGHT_GRAY, CW, 13);

    // === GREEN FOOTER BAR ===
    const footerH = 18;
    drawRect(page, ML, 28, CW, footerH, GREEN_BOX_BG);
    drawRect(page, ML + CW * 0.5, 28, CW * 0.5, footerH, GREEN_BOX_BG2);
  }

  function drawPage2() {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 48;

    drawT(page, 'green', ML, y, 22, false, GREEN);
    const gw = textW('green', false, 22);
    drawT(page, ' funding', ML + gw, y, 22, false, DARK);
    y -= 50;

    const isLowDoc = projectCost <= 250000;

    drawT(page, isLowDoc ? 'Low Doc Requirements' : 'Full Doc Requirements', ML, y, 14, true, GREEN);
    y -= 18;

    const descText = isLowDoc
      ? `Your project cost of ${formatCurrency(projectCost)} qualifies for our Low Doc finance pathway. This is a streamlined process requiring minimal documentation.`
      : `Your project cost of ${formatCurrency(projectCost)} requires our Full Doc finance pathway. Please prepare the documentation listed below.`;
    const descH = drawTextWrapped(page, descText, ML, y, 10, false, GRAY, CW, 15);
    y -= descH + 16;

    const lowDocItems = [
      'Completed Finance Application',
      '6 months business bank statements',
      "Installer's quote / invoice",
      'Signed Privacy Consent & Acknowledgement',
    ];
    const fullDocItems = [
      'Completed Finance Application',
      '2 years financial statements (P&L and Balance Sheet)',
      '2 years tax returns (business and individual)',
      '6 months business bank statements',
      "Installer's quote / invoice",
      'Signed Privacy Consent & Acknowledgement',
    ];
    const items = isLowDoc ? lowDocItems : fullDocItems;

    items.forEach((item, i) => {
      const rowH = 30;
      drawRect(page, ML, y - rowH + 4, CW, rowH, i % 2 === 0 ? ROW_ALT : { r: 1, g: 1, b: 1 });
      drawRect(page, ML + 8, y - rowH + 9, 18, 18, GREEN);
      const numStr = String(i + 1);
      drawT(page, numStr, ML + 8 + (18 - textW(numStr, true, 9)) / 2, y - rowH + 17, 9, true, { r: 1, g: 1, b: 1 });
      drawT(page, item, ML + 34, y - 12, 10, false, DARK);
      y -= rowH;
    });

    y -= 24;
    drawLine(page, ML, y, ML + CW, BORDER_COLOR);
    y -= 20;

    drawT(page, 'Ready to Proceed?', ML, y, 13, true, DARK);
    y -= 16;
    drawT(page, 'Contact our team to get started with your application.', ML, y, 10, false, GRAY);
    y -= 20;

    drawRect(page, ML, y - 54, CW, 54, ROW_ALT);
    drawT(page, 'solutions@greenfunding.com.au', ML + 14, y - 16, 10, false, GREEN);
    drawT(page, '1300 403 100', ML + 14, y - 32, 10, false, GREEN);

    const contactRight = installerName || installerCompany
      ? [installerName, installerCompany].filter(Boolean).join(' | ')
      : 'greenfunding.com.au';
    drawT(page, contactRight, pageWidth - MR - textW(contactRight, false, 9) - 14, y - 16, 9, false, DARK);

    page.drawText('greenfunding.com.au', {
      x: pageWidth / 2 - fontRegular.widthOfTextAtSize('greenfunding.com.au', 8) / 2,
      y: 20, size: 8, font: fontRegular, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b),
    });
  }

  drawPage1();
  drawPage2();

  return await pdfDoc.save();
}

function generateQuoteEmailHtml(
  quoteNumber: string,
  quoteDate: string,
  recipientName: string | undefined,
  recipientCompany: string | undefined,
  siteAddress: string | undefined,
  systemSize: string | undefined,
  contribution: string | undefined,
  projectCost: number,
  assetNames: string[],
  termOptions: TermOption[],
  installerName?: string,
  logoBase64?: string | null
): string {
  const netCapex = projectCost / 1.1;
  const displayName = recipientName || recipientCompany || 'there';
  const preparedFor = recipientCompany || recipientName || 'Valued Customer';

  const termRows = [...termOptions]
    .sort((a, b) => a.years - b.years)
    .map(
      (t) => `
      <tr>
        <td style="padding: 14px 20px; font-size: 15px; color: #3A475B; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif;">${t.years} ${t.years === 1 ? 'Year' : 'Years'}</td>
        <td style="padding: 14px 20px; font-size: 15px; font-weight: 700; color: #3A475B; text-align: right; border-bottom: 1px solid #E5E7EB; font-family: Arial, sans-serif;">$ ${t.monthlyPayment.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`
    )
    .join('');

  const summaryRows = [
    systemSize ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>System:</strong> ${systemSize}</td></tr>` : '',
    contribution ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Contribution:</strong> ${contribution}</td></tr>` : '',
    siteAddress ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Location:</strong> ${siteAddress}</td></tr>` : '',
    assetNames.length > 0 ? `<tr><td style="padding: 8px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Equipment:</strong> ${assetNames.join(', ')}</td></tr>` : '',
    `<tr><td style="padding: 8px 20px 16px 20px; font-size: 14px; color: #1F2937; font-family: Arial, sans-serif;"><strong>Net Capex:</strong> $ ${netCapex.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (ex. GST)</td></tr>`,
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
            <td style="background: linear-gradient(135deg, #1a7a32 0%, #28AA48 60%, #AFD235 100%); padding: 36px 36px 32px 36px;">
              ${logoBase64
                ? `<img src="${logoBase64}" alt="Green Funding" height="48" style="display: block; margin-bottom: 24px; filter: brightness(0) invert(1);" />`
                : `<span style="font-size: 26px; font-weight: 700; color: #ffffff; font-family: Arial, sans-serif; letter-spacing: -0.5px;">Green Funding</span>`
              }
              <p style="color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0; font-family: Arial, sans-serif;">Financing Quote</p>
              <p style="color: #ffffff; font-size: 26px; font-weight: 700; margin: 0 0 10px 0; font-family: Arial, sans-serif; line-height: 1.2;">Your Quote is Ready</p>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; font-family: Arial, sans-serif;">Quote ${quoteNumber} &bull; ${quoteDate}</p>
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

function generateIntroEmailHtml(bodyText: string, logoBase64?: string | null, projectCost?: number): string {
  const paragraphs = bodyText
    .split('\n')
    .map(line => line.trim())
    .reduce((acc: string[], line) => {
      if (line === '') {
        acc.push('');
      } else {
        acc.push(line);
      }
      return acc;
    }, []);

  const htmlParagraphs = paragraphs
    .join('\n')
    .split(/\n\n+/)
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) return '';
      return `<p style="font-size: 15px; color: #4B5563; margin: 0 0 16px 0; line-height: 1.7; font-family: Arial, sans-serif;">${lines.join('<br/>')}</p>`;
    })
    .filter(p => p !== '')
    .join('');

  const showBankStatementLink = typeof projectCost === 'number' && projectCost >= 150000 && projectCost <= 250000;

  const bankStatementBlock = showBankStatementLink ? `
          <tr>
            <td style="padding: 0 36px 28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0FDF4; border-radius: 8px; border: 1px solid #BBF7D0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="font-size: 14px; font-weight: 700; color: #166534; margin: 0 0 6px 0; font-family: Arial, sans-serif;">Submit Your Bank Statements Instantly</p>
                    <p style="font-size: 13px; color: #15803D; margin: 0 0 14px 0; line-height: 1.6; font-family: Arial, sans-serif;">View your bank statements. Instantly. The secure, incredibly easy way to submit your bank statement data in seconds.</p>
                    <a href="https://scv.bankstatements.com.au/HSHV" style="display: inline-block; background-color: #28AA48; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-family: Arial, sans-serif;">Submit Bank Statements &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : '';

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
          <tr>
            <td style="background: linear-gradient(135deg, #1a7a32 0%, #28AA48 60%, #AFD235 100%); padding: 32px 36px;">
              ${logoBase64
                ? `<img src="${logoBase64}" alt="Green Funding" height="48" style="display: block; filter: brightness(0) invert(1);" />`
                : `<span style="font-size: 26px; font-weight: 700; color: #ffffff; font-family: Arial, sans-serif; letter-spacing: -0.5px;">Green Funding</span>`
              }
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              ${htmlParagraphs}
            </td>
          </tr>
          ${bankStatementBlock}
          <tr>
            <td style="border-top: 2px solid #E5E7EB; padding: 28px 36px; background-color: #F9FAFB;">
              <p style="font-size: 13px; font-weight: 700; color: #3A475B; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Green Funding</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 6px;">
                    <span style="font-size: 12px; color: #6B7280; font-family: Arial, sans-serif;">&#128205; Level 18, 324 Queen Street, Brisbane QLD 4000</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 6px;">
                    <span style="font-size: 12px; color: #6B7280; font-family: Arial, sans-serif;">&#128222; <a href="tel:1300403100" style="color: #28AA48; text-decoration: none;">1300 403 100</a></span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 6px;">
                    <span style="font-size: 12px; color: #6B7280; font-family: Arial, sans-serif;">&#9993; <a href="mailto:solutions@greenfunding.com.au" style="color: #28AA48; text-decoration: none;">solutions@greenfunding.com.au</a></span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size: 12px; color: #6B7280; font-family: Arial, sans-serif;">&#127760; <a href="https://greenfunding.com.au" style="color: #28AA48; text-decoration: none;">greenfunding.com.au</a></span>
                  </td>
                </tr>
              </table>
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

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachment?: { content: string; name: string }
): Promise<Response> {
  const body: Record<string, unknown> = {
    Recipients: [{ Email: to }],
    Content: {
      From: 'noreply@portal.greenfunding.com.au',
      ReplyTo: 'solutions@greenfunding.com.au',
      Subject: subject,
      Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: htmlBody }],
    },
  };

  if (attachment) {
    (body.Content as Record<string, unknown>).Attachments = [
      {
        BinaryContent: attachment.content,
        Name: attachment.name,
        ContentType: 'application/pdf',
      },
    ];
  }

  return fetch('https://api.elasticemail.com/v4/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ElasticEmail-ApiKey': apiKey,
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');

    const payload: QuotePayload = await req.json();

    const {
      recipientEmail,
      recipientName,
      recipientCompany,
      siteAddress,
      systemSize,
      contribution,
      clientPhone,
      projectCost,
      selectedAssetIds,
      termOptions,
      paymentTiming,
      calculatorType,
      installerId,
      introEmailSubject,
      introEmailBody,
    } = payload;

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
        recipient_email: recipientEmail || null,
        recipient_name: recipientName || null,
        recipient_company: recipientCompany || null,
        site_address: siteAddress || null,
        system_size: systemSize || null,
        client_phone: clientPhone || null,
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

    const pdfBytes = await generateQuotePdf(
      quoteNumber,
      quoteDate,
      recipientName,
      recipientCompany,
      siteAddress,
      systemSize,
      contribution,
      projectCost,
      assetNames,
      termOptions,
      installerName,
      installerCompany,
      clientPhone,
      null
    );

    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

    if (mode === 'generate') {
      const pdfPath = `quotes/${quoteRecord.quote_number}/GreenFunding-Quote-${quoteNumber}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('quote-pdfs')
        .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });

      let pdfUrl: string | null = null;
      if (!uploadError) {
        const { data: publicData } = supabase.storage.from('quote-pdfs').getPublicUrl(pdfPath);
        pdfUrl = publicData?.publicUrl ?? null;
        if (pdfUrl) {
          await supabase.from('sent_quotes').update({ pdf_url: pdfUrl }).eq('quote_number', quoteRecord.quote_number);
        }
      } else {
        console.error('PDF upload error:', uploadError);
      }

      return new Response(
        JSON.stringify({ success: true, quoteNumber, pdfBase64, filename: `GreenFunding-Quote-${quoteNumber}.pdf`, pdfUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'recipientEmail is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const logoBase64 = null;

    const quoteEmailHtml = generateQuoteEmailHtml(
      quoteNumber,
      quoteDate,
      recipientName,
      recipientCompany,
      siteAddress,
      systemSize,
      contribution,
      projectCost,
      assetNames,
      termOptions,
      installerName,
      logoBase64
    );

    const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');

    if (!elasticEmailApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preparedFor = recipientCompany || recipientName || 'Valued Customer';
    const quoteSubjectLine = `Your Green Funding Quote ${quoteNumber} - ${preparedFor}`;

    const hasIntroEmail = !!(introEmailBody && introEmailBody.trim());

    if (hasIntroEmail) {
      const introSubject = introEmailSubject?.trim() || 'Introduction to Green Funding – Solar Finance Options';
      const introHtml = generateIntroEmailHtml(introEmailBody!, logoBase64, projectCost);
      const introResponse = await sendEmail(elasticEmailApiKey, recipientEmail, introSubject, introHtml);
      if (!introResponse.ok) {
        const introResult = await introResponse.json();
        console.error('Intro email API error:', introResult);
        return new Response(
          JSON.stringify({ error: 'Failed to send intro email', details: introResult }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      EdgeRuntime.waitUntil((async () => {
        await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
        await sendEmail(elasticEmailApiKey, recipientEmail, quoteSubjectLine, quoteEmailHtml, {
          content: pdfBase64,
          name: `GreenFunding-Quote-${quoteNumber}.pdf`,
        });
      })());

      return new Response(
        JSON.stringify({
          success: true,
          quoteNumber,
          emailId: 'sent',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quoteResponse = await sendEmail(elasticEmailApiKey, recipientEmail, quoteSubjectLine, quoteEmailHtml, {
      content: pdfBase64,
      name: `GreenFunding-Quote-${quoteNumber}.pdf`,
    });

    if (!quoteResponse.ok) {
      const quoteResult = await quoteResponse.json();
      console.error('Quote email API error:', quoteResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: quoteResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quoteResult = await quoteResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        quoteNumber,
        emailId: quoteResult.TransactionID || 'sent',
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
