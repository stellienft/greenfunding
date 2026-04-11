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
  costPerKwhCents?: number;
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
  annualSolarGenerationKwh?: number;
  energySavings?: number;
  disclaimerText?: string;
  installerEmail?: string;
  installerPhone?: string;
}

const formatCurrencyAU = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCurrencyDecimals = (amount: number): string => {
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

const C = {
  DARK: hexToRgb('#1a2e3b'),
  DARK2: hexToRgb('#2D3A4A'),
  DARK_TEXT: hexToRgb('#3A475B'),
  GREEN: hexToRgb('#28AA48'),
  GREEN2: hexToRgb('#AFD235'),
  GREEN_LIGHT: hexToRgb('#DCFCE7'),
  GREEN_BORDER: hexToRgb('#BBF7D0'),
  GRAY_TEXT: hexToRgb('#6B7280'),
  GRAY_LIGHT: hexToRgb('#9CA3AF'),
  GRAY_BG: hexToRgb('#F9FAFB'),
  GRAY_BG2: hexToRgb('#F3F4F6'),
  BORDER: hexToRgb('#E5E7EB'),
  BORDER2: hexToRgb('#D1D5DB'),
  WHITE: { r: 1, g: 1, b: 1 },
  AMBER_BG: hexToRgb('#FFFBEB'),
  AMBER_BORDER: hexToRgb('#FDE68A'),
  AMBER_TEXT: hexToRgb('#92400E'),
  BLUE_BG: hexToRgb('#EFF6FF'),
  BLUE_BORDER: hexToRgb('#BFDBFE'),
  BLUE_TEXT: hexToRgb('#1E3A5F'),
};

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
  installerCompany?: string,
  installerEmail?: string,
  installerPhone?: string,
  clientPhone?: string,
  clientEmail?: string,
  annualSolarGenerationKwh?: number,
  energySavings?: number,
  disclaimerText?: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = PageSizes.A4[0];
  const H = PageSizes.A4[1];
  const PL = 40;
  const PR = 40;
  const CW = W - PL - PR;

  const sortedTerms = [...termOptions].sort((a, b) => a.years - b.years);
  const isLowDoc = projectCost < 250000;
  const hasSolar = !!(annualSolarGenerationKwh && annualSolarGenerationKwh > 0);
  const hasSavings = !!(energySavings && energySavings > 0);

  function tw(text: string, bold: boolean, size: number): number {
    return (bold ? fontB : fontR).widthOfTextAtSize(String(text ?? ''), size);
  }

  function dt(page: ReturnType<typeof pdfDoc.addPage>, text: string, x: number, y: number, size: number, bold: boolean, color: { r: number; g: number; b: number }, opacity = 1) {
    const font = bold ? fontB : fontR;
    page.drawText(String(text ?? ''), { x, y, size, font, color: rgb(color.r, color.g, color.b), opacity });
  }

  function dr(page: ReturnType<typeof pdfDoc.addPage>, x: number, y: number, w: number, h: number, color: { r: number; g: number; b: number }, opacity = 1, borderColor?: { r: number; g: number; b: number }, borderWidth = 0) {
    page.drawRectangle({
      x, y, width: w, height: h,
      color: rgb(color.r, color.g, color.b),
      opacity,
      ...(borderColor ? { borderColor: rgb(borderColor.r, borderColor.g, borderColor.b), borderWidth } : {}),
    });
  }

  function dl(page: ReturnType<typeof pdfDoc.addPage>, x1: number, y1: number, x2: number, y2: number, color: { r: number; g: number; b: number }, thickness = 0.5) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: rgb(color.r, color.g, color.b) });
  }

  function wrapText(text: string, bold: boolean, size: number, maxW: number): string[] {
    const words = String(text ?? '').split(' ');
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (tw(test, bold, size) > maxW && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function dtWrapped(page: ReturnType<typeof pdfDoc.addPage>, text: string, x: number, y: number, size: number, bold: boolean, color: { r: number; g: number; b: number }, maxW: number, lineH?: number): number {
    const lh = lineH ?? size * 1.5;
    const lines = wrapText(text, bold, size, maxW);
    let curY = y;
    for (const line of lines) {
      dt(page, line, x, curY, size, bold, color);
      curY -= lh;
    }
    return y - curY;
  }

  function drawPageHeader(page: ReturnType<typeof pdfDoc.addPage>, topY: number): number {
    const headerH = 56;
    const gradMidX = W * 0.55;
    dr(page, 0, topY - headerH, W * 0.55, headerH, C.DARK);
    dr(page, gradMidX - 1, topY - headerH, W - gradMidX + 1, headerH, C.DARK2);

    const logoText = 'Green Funding';
    dt(page, logoText, PL, topY - 22, 15, true, C.WHITE);
    const subText = 'Finance Solutions for Clean Energy';
    dt(page, subText, PL, topY - 36, 7, false, { r: 1, g: 1, b: 1 }, 0.6);

    const qnLabel = 'Finance Quote';
    const qnLabelW = tw(qnLabel, false, 7);
    dt(page, qnLabel, W - PR - qnLabelW, topY - 18, 7, false, { r: 1, g: 1, b: 1 }, 0.6);
    const qnW = tw(quoteNumber, true, 11);
    dt(page, quoteNumber, W - PR - qnW, topY - 30, 11, true, C.WHITE);
    const qdW = tw(quoteDate, false, 8);
    dt(page, quoteDate, W - PR - qdW, topY - 42, 8, false, { r: 1, g: 1, b: 1 }, 0.5);

    return topY - headerH;
  }

  function drawMiniHeader(page: ReturnType<typeof pdfDoc.addPage>, topY: number): number {
    const headerH = 40;
    dr(page, 0, topY - headerH, W * 0.55, headerH, C.DARK);
    dr(page, W * 0.55 - 1, topY - headerH, W - W * 0.55 + 1, headerH, C.DARK2);

    dt(page, 'Green Funding', PL, topY - 16, 12, true, C.WHITE);
    const qnW = tw(quoteNumber, false, 7);
    dt(page, quoteNumber, W - PR - qnW, topY - 14, 7, false, { r: 1, g: 1, b: 1 }, 0.55);
    const qdW = tw(quoteDate, false, 7);
    dt(page, quoteDate, W - PR - qdW, topY - 25, 7, false, { r: 1, g: 1, b: 1 }, 0.4);

    return topY - headerH;
  }

  function drawPageFooter(page: ReturnType<typeof pdfDoc.addPage>) {
    const footerH = 24;
    const footerY = 0;
    dr(page, 0, footerY, W * 0.55, footerH, C.DARK);
    dr(page, W * 0.55 - 1, footerY, W - W * 0.55 + 1, footerH, C.DARK2);
    const footerText = 'This quote is indicative only and subject to credit approval. Valid for 30 days.';
    const ftW = tw(footerText, false, 6.5);
    dt(page, footerText, (W - ftW) / 2, footerY + 8, 6.5, false, { r: 1, g: 1, b: 1 }, 0.5);
  }

  function drawSectionLabel(page: ReturnType<typeof pdfDoc.addPage>, label: string, x: number, y: number) {
    dt(page, label.toUpperCase(), x, y, 7, true, C.GRAY_LIGHT);
  }

  function drawLabelValue(page: ReturnType<typeof pdfDoc.addPage>, label: string, value: string, x: number, y: number, maxW: number): number {
    dt(page, label, x, y, 7, true, C.GRAY_TEXT);
    return dtWrapped(page, value, x, y - 12, 9, true, C.DARK_TEXT, maxW, 13);
  }

  function drawInfoCard(page: ReturnType<typeof pdfDoc.addPage>, x: number, y: number, w: number, h: number, label: string, value: string, bold: boolean, bgColor: { r: number; g: number; b: number }, labelColor: { r: number; g: number; b: number }, valueColor: { r: number; g: number; b: number }, borderColor?: { r: number; g: number; b: number }) {
    dr(page, x, y - h, w, h, bgColor, 1, borderColor, borderColor ? 0.75 : 0);
    const lW = tw(label, false, 7);
    dt(page, label, x + (w - lW) / 2, y - 13, 7, false, labelColor);
    const vLines = wrapText(value, bold, bold ? 11 : 9, w - 12);
    const vH = vLines.length * 14;
    const vStartY = y - h / 2 - vH / 2 + (vLines.length > 1 ? 6 : 2);
    for (let i = 0; i < vLines.length; i++) {
      const vW = tw(vLines[i], bold, bold ? 11 : 9);
      dt(page, vLines[i], x + (w - vW) / 2, vStartY - i * 14, bold ? 11 : 9, bold, valueColor);
    }
  }

  function drawPage1() {
    const page = pdfDoc.addPage([W, H]);
    let y = H;

    y = drawPageHeader(page, y);
    y -= 16;

    const colW = (CW - 8) / 2;

    dr(page, PL, y - 80, colW, 80, C.GRAY_BG, 1, C.BORDER, 0.75);
    dr(page, PL + colW + 8, y - 80, colW, 80, C.GRAY_BG, 1, C.BORDER, 0.75);

    drawSectionLabel(page, 'Prepared By', PL + 10, y - 10);
    let byY = y - 24;
    if (installerCompany) {
      byY -= dtWrapped(page, installerCompany, PL + 10, byY, 9, true, C.DARK_TEXT, colW - 20, 13);
    }
    if (installerName && installerCompany) {
      dt(page, installerName, PL + 10, byY, 8, false, C.GRAY_TEXT);
      byY -= 12;
    } else if (installerName) {
      byY -= dtWrapped(page, installerName, PL + 10, byY, 9, true, C.DARK_TEXT, colW - 20, 13);
    }
    if (installerEmail) {
      dt(page, installerEmail, PL + 10, byY, 7.5, false, C.GRAY_TEXT);
      byY -= 11;
    }
    if (installerPhone) {
      dt(page, installerPhone, PL + 10, byY, 7.5, false, C.GRAY_TEXT);
    }

    const forX = PL + colW + 18;
    drawSectionLabel(page, 'Prepared For', forX, y - 10);
    let forY = y - 24;
    forY -= dtWrapped(page, recipientCompany || recipientName || '', forX, forY, 9, true, C.DARK_TEXT, colW - 20, 13);
    if (siteAddress) {
      forY -= dtWrapped(page, siteAddress, forX, forY, 7.5, false, C.GRAY_TEXT, colW - 20, 11);
    }
    if (clientEmail) {
      dt(page, clientEmail, forX, forY, 7.5, false, C.GRAY_TEXT);
      forY -= 11;
    }
    if (clientPhone) {
      dt(page, clientPhone, forX, forY, 7.5, false, C.GRAY_TEXT);
    }

    y -= 92;

    drawSectionLabel(page, 'Project Summary', PL, y);
    y -= 14;

    const cardCount = 2 + (systemSize ? 1 : 0) + (hasSolar && annualSolarGenerationKwh ? 1 : 0);
    const cardGap = 6;
    const cardW = (CW - cardGap * (cardCount - 1)) / cardCount;
    const cardH = 52;

    drawInfoCard(page, PL, y, cardW, cardH, 'Project Cost', formatCurrencyAU(projectCost), true, C.GREEN, { r: 1, g: 1, b: 1 }, C.WHITE);

    const assetText = assetNames.join(', ') || 'N/A';
    drawInfoCard(page, PL + cardW + cardGap, y, cardW, cardH, 'Equipment', assetText, false, C.GRAY_BG2, C.GRAY_TEXT, C.DARK_TEXT, C.BORDER2);

    if (systemSize) {
      drawInfoCard(page, PL + (cardW + cardGap) * 2, y, cardW, cardH, 'System Size', systemSize, true, C.GRAY_BG2, C.GRAY_TEXT, C.DARK_TEXT, C.BORDER2);
    }

    if (hasSolar && annualSolarGenerationKwh) {
      const idx = systemSize ? 3 : 2;
      drawInfoCard(page, PL + (cardW + cardGap) * idx, y, cardW, cardH, 'Annual Generation', `${annualSolarGenerationKwh.toLocaleString()} kWh`, true, C.GRAY_BG2, C.GRAY_TEXT, C.DARK_TEXT, C.BORDER2);
    }

    y -= cardH + 18;

    if (hasSolar && annualSolarGenerationKwh) {
      drawSectionLabel(page, 'Solar Generation Details', PL, y);
      y -= 14;

      const solCardGap = 6;
      const solCardCount = 1 + (hasSavings ? 1 : 0) + sortedTerms.filter(t => t.costPerKwhCents && t.costPerKwhCents > 0).length;
      const solCardW = (CW - solCardGap * (solCardCount - 1)) / solCardCount;
      const solCardH = 52;

      drawInfoCard(page, PL, y, solCardW, solCardH, 'Annual Generation', `${annualSolarGenerationKwh.toLocaleString()} kWh`, true, C.AMBER_BG, C.AMBER_TEXT, C.AMBER_TEXT, C.AMBER_BORDER);

      let solIdx = 1;
      if (hasSavings && energySavings) {
        drawInfoCard(page, PL + (solCardW + solCardGap) * solIdx, y, solCardW, solCardH, 'Est. Annual Savings', formatCurrencyAU(energySavings), true, C.GREEN_LIGHT, C.GREEN, C.GREEN, C.GREEN_BORDER);
        solIdx++;
      }

      for (const t of sortedTerms) {
        if (t.costPerKwhCents && t.costPerKwhCents > 0) {
          drawInfoCard(page, PL + (solCardW + solCardGap) * solIdx, y, solCardW, solCardH, `Cost/kWh (${t.years}yr)`, `${t.costPerKwhCents.toFixed(2)}c`, true, C.BLUE_BG, C.BLUE_TEXT, C.BLUE_TEXT, C.BLUE_BORDER);
          solIdx++;
        }
      }

      y -= solCardH + 18;
    }

    drawSectionLabel(page, 'Repayment Options', PL, y);
    y -= 14;

    const tableHeaderH = 28;
    const hasInterest = sortedTerms.some(t => t.interestRate !== undefined);
    const hasTotalFinanced = sortedTerms.some(t => t.totalFinanced !== undefined);

    const col1W = 130;
    const col2W = hasTotalFinanced || hasInterest ? (CW - col1W) / 3 : CW - col1W;
    const col3W = hasTotalFinanced ? (CW - col1W) / 3 : 0;
    const col4W = hasInterest ? (CW - col1W) / 3 : 0;

    dr(page, PL, y - tableHeaderH, CW * 0.5, tableHeaderH, C.DARK);
    dr(page, PL + CW * 0.5 - 1, y - tableHeaderH, CW * 0.5 + 1, tableHeaderH, C.DARK2);
    dr(page, PL, y - tableHeaderH, CW, tableHeaderH, C.DARK, 1, undefined, 0);

    dt(page, 'Loan Term', PL + 14, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
    dt(page, 'Monthly Repayment', PL + col1W + col2W - tw('Monthly Repayment', true, 7.5) - 10, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
    if (hasTotalFinanced && col3W > 0) {
      dt(page, 'Total Financed', PL + col1W + col2W + col3W - tw('Total Financed', true, 7.5) - 10, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
    }
    if (hasInterest && col4W > 0) {
      dt(page, 'Interest Rate', W - PR - tw('Interest Rate', true, 7.5) - 10, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
    }

    y -= tableHeaderH;

    dr(page, PL, y - tableHeaderH * sortedTerms.length, CW, tableHeaderH * sortedTerms.length, C.WHITE, 1, C.BORDER, 0.75);

    sortedTerms.forEach((t, i) => {
      const rowH = 28;
      const rowY = y - rowH * i;
      if (i % 2 !== 0) {
        dr(page, PL, rowY - rowH, CW, rowH, C.GRAY_BG2);
      }
      dl(page, PL, rowY, PL + CW, rowY, C.BORDER, 0.5);

      const dotX = PL + 16;
      const dotY = rowY - rowH / 2 - 1;
      page.drawCircle({ x: dotX, y: dotY, size: 3, color: rgb(C.GREEN.r, C.GREEN.g, C.GREEN.b) });

      const termLabel = `${t.years} Year${t.years !== 1 ? 's' : ''}`;
      dt(page, termLabel, PL + 26, rowY - rowH / 2 - 4, 9.5, true, C.DARK_TEXT);

      const amtText = formatCurrencyDecimals(t.monthlyPayment);
      const amtW = tw(amtText, true, 11);
      dt(page, amtText, PL + col1W + col2W - amtW - 10, rowY - rowH / 2 - 4, 11, true, C.GREEN);
      const moLabel = '/mo';
      dt(page, moLabel, PL + col1W + col2W - 10, rowY - rowH / 2 - 3, 7, false, C.GRAY_LIGHT);

      if (hasTotalFinanced && t.totalFinanced !== undefined && col3W > 0) {
        const tfText = formatCurrencyAU(t.totalFinanced);
        const tfW = tw(tfText, false, 8.5);
        dt(page, tfText, PL + col1W + col2W + col3W - tfW - 10, rowY - rowH / 2 - 4, 8.5, false, C.GRAY_TEXT);
      }

      if (hasInterest && t.interestRate !== undefined && col4W > 0) {
        const irText = `${(t.interestRate * 100).toFixed(2)}%`;
        const irW = tw(irText, false, 8.5);
        dt(page, irText, W - PR - irW - 10, rowY - rowH / 2 - 4, 8.5, false, C.GRAY_TEXT);
      }
    });

    y -= tableHeaderH * sortedTerms.length;

    const noteText = `* All repayments include GST. Quote valid for 30 days from ${quoteDate}.`;
    dt(page, noteText, PL, y - 10, 7, false, C.GRAY_LIGHT);
    y -= 28;

    drawPageFooter(page);
  }

  function drawPage2() {
    const page = pdfDoc.addPage([W, H]);
    let y = H;

    y = drawMiniHeader(page, y);
    y -= 20;

    drawSectionLabel(page, "What You'll Need to Apply", PL, y);
    y -= 16;

    if (isLowDoc) {
      let lowDocTitle: string;
      let lowDocItems: Array<{ label: string; url?: string }>;

      if (projectCost >= 150000) {
        lowDocTitle = 'Low Doc Requirements ($150k\u2013$250k)';
        lowDocItems = [
          { label: 'Invoice to be financed' },
          { label: "Directors Drivers Licence & Medicare card" },
          { label: '6 months Bank Statements', url: 'scv.bankstatements.com.au/HSHV' },
          { label: 'Privacy Consent', url: 'drive.google.com' },
          { label: 'Asset and Liability statement', url: 'drive.google.com' },
        ];
      } else {
        lowDocTitle = 'Low Doc Requirements (up to $150k)';
        lowDocItems = [
          { label: 'Invoice to be financed' },
          { label: "Directors Drivers Licence & Medicare card" },
          { label: 'Privacy Consent', url: 'drive.google.com' },
          { label: 'Asset and Liability statement', url: 'drive.google.com' },
        ];
      }

      dt(page, lowDocTitle, PL, y, 10, true, C.DARK_TEXT);
      y -= 16;

      for (const item of lowDocItems) {
        const rowH = 28;
        dr(page, PL, y - rowH, CW, rowH, C.GRAY_BG, 1, C.BORDER, 0.75);
        page.drawCircle({ x: PL + 14, y: y - rowH / 2 - 1, size: 6, color: rgb(C.GREEN.r, C.GREEN.g, C.GREEN.b) });
        dt(page, '\u2713', PL + 10.5, y - rowH / 2 - 3.5, 7, true, C.WHITE);
        const maxItemW = CW - 30 - (item.url ? 90 : 0);
        dtWrapped(page, item.label, PL + 26, y - rowH / 2 - 3, 8.5, false, C.DARK_TEXT, maxItemW, 12);
        if (item.url) {
          dt(page, `[Download]`, W - PR - tw('[Download]', false, 7.5), y - rowH / 2 - 3, 7.5, false, C.GREEN);
        }
        y -= rowH + 4;
      }
    } else {
      dt(page, 'Full Doc Requirements', PL, y, 10, true, C.DARK_TEXT);
      y -= 16;

      const fullDocRows = [
        { document: 'FY24 & FY25 Accountant prepared financials', u500: true, m500: true, o1m: true },
        { document: 'Mgt YTD Dec 25 Financials', u500: true, m500: true, o1m: true },
        { document: 'Finance Commitment Schedule', u500: true, m500: true, o1m: true },
        { document: 'Current ATO Portal Statement', u500: true, m500: true, o1m: true },
        { document: 'Business Overview and Major Clients', u500: true, m500: true, o1m: true },
        { document: 'Asset and Liability', u500: true, m500: true, o1m: true },
        { document: 'Aged Debtors and Creditors', u500: false, m500: true, o1m: true },
        { document: 'Cashflow Projections', u500: false, m500: false, o1m: true },
      ];

      const tableHeaderH = 26;
      dr(page, PL, y - tableHeaderH, CW * 0.5, tableHeaderH, C.DARK);
      dr(page, PL + CW * 0.5 - 1, y - tableHeaderH, CW * 0.5 + 1, tableHeaderH, C.DARK2);

      const docColW = CW * 0.55;
      const checkColW = (CW - docColW) / 3;

      dt(page, 'Document', PL + 10, y - 10, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
      dt(page, '<$500k', PL + docColW + checkColW / 2 - tw('<$500k', true, 7.5) / 2, y - 10, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
      dt(page, '$500k\u2013$1m', PL + docColW + checkColW * 1.5 - tw('$500k\u2013$1m', true, 7.5) / 2, y - 10, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
      dt(page, '$1m+', PL + docColW + checkColW * 2.5 - tw('$1m+', true, 7.5) / 2, y - 10, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);

      y -= tableHeaderH;

      dr(page, PL, y - 24 * fullDocRows.length, CW, 24 * fullDocRows.length, C.WHITE, 1, C.BORDER, 0.75);

      fullDocRows.forEach((row, i) => {
        const rowH = 24;
        const rowY = y - rowH * i;
        if (i % 2 !== 0) dr(page, PL, rowY - rowH, CW, rowH, C.GRAY_BG2);
        dl(page, PL, rowY, PL + CW, rowY, C.BORDER, 0.4);

        const isApplicable =
          (projectCost < 500000 && row.u500) ||
          (projectCost >= 500000 && projectCost < 1000000 && row.m500) ||
          (projectCost >= 1000000 && row.o1m);

        dt(page, row.document, PL + 10, rowY - rowH / 2 - 3.5, 8, false, isApplicable ? C.DARK_TEXT : C.GRAY_LIGHT);

        [[row.u500, 0.5], [row.m500, 1.5], [row.o1m, 2.5]].forEach(([val, multiplier]) => {
          const cx = PL + docColW + checkColW * (multiplier as number);
          const cy = rowY - rowH / 2;
          const r = 7;
          if (val) {
            page.drawCircle({ x: cx, y: cy, size: r, color: rgb(C.GREEN_LIGHT.r, C.GREEN_LIGHT.g, C.GREEN_LIGHT.b) });
            dt(page, '\u2713', cx - 3.5, cy - 3, 8, true, C.GREEN);
          } else {
            page.drawCircle({ x: cx, y: cy, size: r, color: rgb(0.99, 0.9, 0.9) });
            dt(page, 'x', cx - 3, cy - 3.5, 8, true, { r: 0.8, g: 0.2, b: 0.2 });
          }
        });
      });

      y -= 24 * fullDocRows.length;
    }

    y -= 20;

    const getStartedH = 64;
    dr(page, PL, y - getStartedH, CW, getStartedH, C.GRAY_BG, 1, C.BORDER, 0.75);

    drawSectionLabel(page, 'Get Started', PL + 14, y - 10);
    const contactText = 'Contact your Green Funding representative to begin the application process.';
    dtWrapped(page, contactText, PL + 14, y - 22, 8, false, C.GRAY_TEXT, CW / 2 - 20, 12);

    const contactRightX = PL + CW / 2 + 14;
    dt(page, 'Phone:', contactRightX, y - 22, 8, true, C.DARK_TEXT);
    dt(page, '1300 GET GFN', contactRightX + tw('Phone: ', true, 8), y - 22, 8, false, C.GRAY_TEXT);
    dt(page, 'Email:', contactRightX, y - 34, 8, true, C.DARK_TEXT);
    dt(page, 'info@greenfunding.com.au', contactRightX + tw('Email: ', true, 8), y - 34, 8, false, C.GRAY_TEXT);
    dt(page, 'Web:', contactRightX, y - 46, 8, true, C.DARK_TEXT);
    dt(page, 'www.greenfunding.com.au', contactRightX + tw('Web: ', true, 8), y - 46, 8, false, C.GRAY_TEXT);

    y -= getStartedH + 16;

    if (disclaimerText) {
      const disclaimerH = 36 + dtWrapped(page, disclaimerText, PL + 12, y - 20, 7.5, false, C.AMBER_TEXT, CW - 24, 11);
      dr(page, PL, y - disclaimerH, CW, disclaimerH, C.AMBER_BG, 1, C.AMBER_BORDER, 0.75);
      dtWrapped(page, disclaimerText, PL + 12, y - 14, 7.5, false, C.AMBER_TEXT, CW - 24, 11);
    }

    drawPageFooter(page);
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
      clientPhone,
      projectCost,
      selectedAssetIds,
      termOptions,
      paymentTiming,
      calculatorType,
      installerId,
      introEmailSubject,
      introEmailBody,
      annualSolarGenerationKwh,
      energySavings,
      disclaimerText,
      installerEmail: payloadInstallerEmail,
      installerPhone: payloadInstallerPhone,
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
    let installerEmail: string | undefined = payloadInstallerEmail;
    let installerPhone: string | undefined = payloadInstallerPhone;

    if (installerId) {
      const { data: installer } = await supabase
        .from('installer_users')
        .select('full_name, company_name, email, phone_number')
        .eq('id', installerId)
        .maybeSingle();
      if (installer) {
        installerName = installer.full_name;
        installerCompany = installer.company_name;
        if (!installerEmail) installerEmail = installer.email;
        if (!installerPhone) installerPhone = installer.phone_number;
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
      .select('id, quote_number, created_at')
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
      projectCost,
      assetNames,
      termOptions,
      installerName,
      installerCompany,
      installerEmail,
      installerPhone,
      clientPhone,
      recipientEmail,
      annualSolarGenerationKwh,
      energySavings,
      disclaimerText,
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
        JSON.stringify({ success: true, quoteNumber, quoteId: quoteRecord.id, pdfBase64, filename: `GreenFunding-Quote-${quoteNumber}.pdf`, pdfUrl, assetNames }),
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
      undefined,
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
