import { createClient } from 'npm:@supabase/supabase-js@2';

async function getResendApiKey(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase.from('site_settings').select('resend_api_key').maybeSingle();
  return (data?.resend_api_key as string | undefined)?.trim() || Deno.env.get('RESEND_API_KEY') || null;
}
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
  companyAddress?: string;
  systemSize?: string;
  contribution?: string;
  clientPhone?: string;
  clientPersonName?: string;
  abn?: string;
  natureOfBusiness?: string;
  entityName?: string;
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
  quoteId?: string;
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
  DARK: hexToRgb('#094325'),
  DARK2: hexToRgb('#094325'),
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
  TEAL: hexToRgb('#5EC4C1'),
};

// SVG logo paths from green-funding-invertedlogo.svg (white text + gradient GG icon)
// Scale factor to fit in header: original viewBox 366x66, we render at ~110x20 pts
const LOGO_SCALE = 0.38;
const LOGO_PATHS_WHITE = [
  "M22.0898 45.9182C29.407 45.9182 34.2823 47.4915 34.2823 53.7162C34.2823 61.3 26.9651 65.5913 16.7073 65.5184C6.81065 65.4455 0.925104 61.5143 0.925104 54.3593C0.925104 52.2158 1.64306 50.2095 2.79094 48.5675C0.99819 46.8527 -0.0078125 44.5635 -0.0078125 42.1284C-0.0078125 39.3376 1.42811 36.0494 4.65247 34.4032C3.5046 32.4741 2.85972 30.2534 2.85972 27.7498C2.85972 20.3847 9.24397 14.7344 17.1329 14.7344H33.4138V19.8145H27.8206C29.4715 21.8894 30.4732 24.5345 30.4732 27.7541C30.4732 35.2649 24.4501 40.9152 16.703 40.9152C13.7624 40.9152 11.0367 40.1264 8.81405 38.6988C6.94822 39.269 5.87343 40.4136 5.87343 42.1327C5.87343 44.422 8.0961 45.9224 10.9679 45.9224H22.0855L22.0898 45.9182ZM28.4741 54.2135C28.4741 51.4956 26.1096 51.2083 20.8001 51.2083H9.68248C9.1107 51.2083 8.53461 51.1355 7.96282 51.0669C7.10299 52.07 6.67308 53.1418 6.67308 54.355C6.67308 58.2905 10.1855 60.1468 16.7159 60.1468C23.6719 60.1468 28.4784 57.7846 28.4784 54.2092L28.4741 54.2135ZM8.46152 27.7498C8.46152 32.2554 11.9051 35.6893 16.7116 35.6893C21.5181 35.6893 24.9617 32.3283 24.9617 27.7498C24.9617 23.4585 21.733 20.1703 16.7847 20.1703C11.8364 20.1703 8.46582 23.5313 8.46582 27.7498H8.46152Z",
  "M58.672 16.0205L56.3032 21.3835C55.2284 21.0277 53.8656 20.7405 52.6446 20.7405C47.5501 20.7405 43.5347 24.1744 43.5347 31.1108V51.2083H37.7266V15.5918H42.1719L43.0317 19.5273C45.3275 16.3077 49.201 14.7344 53.1433 14.7344C55.2241 14.7344 57.2318 15.3774 58.6678 16.0205H58.672Z",
  "M154.416 29.2545V51.2126H148.607V30.3263C148.607 23.2441 143.947 20.6719 139.498 20.6719C133.831 20.6719 130.031 24.9632 130.031 30.6864V51.2126H124.223V15.5918H128.668L129.601 19.6687C132.683 16.0934 136.918 14.7344 140.289 14.7344C147.103 14.7344 154.42 19.4544 154.42 29.2545H154.416Z",
  "M177.944 14.3744V15.5919H185.906V21.3837H177.944V51.2084H172.204V21.3837H166.035V15.5919H172.204V13.7313C172.204 4.29131 177.08 0 184.685 0C185.906 0 187.196 0.0728793 188.485 0.28723V5.5817C187.479 5.44023 186.551 5.36735 185.687 5.36735C180.162 5.36735 177.94 8.29967 177.94 14.3787L177.944 14.3744Z",
  "M212.584 15.5918H218.393V51.2126H214.089L213.014 47.1357C210.001 50.6382 205.697 52.07 202.327 52.07C195.512 52.07 188.195 47.4229 188.195 37.1941V15.5918H194.003V35.9037C194.003 43.4874 198.664 46.1325 203.113 46.1325C208.565 46.1325 212.58 41.9827 212.58 35.0463V15.5918H212.584Z",
  "M251.744 29.2545V51.2126H245.936V30.3263C245.936 23.2441 241.275 20.6719 236.826 20.6719C231.159 20.6719 227.359 24.9632 227.359 30.6864V51.2126H221.551V15.5918H225.996L226.929 19.6687C230.011 16.0934 234.246 14.7344 237.617 14.7344C244.431 14.7344 251.748 19.4544 251.748 29.2545H251.744Z",
  "M278.638 1.14453H284.446V51.2126H280.001L279.141 47.0628C276.987 50.2823 273.118 52.07 268.668 52.07C260.276 52.07 253.965 45.8453 253.965 34.5447V32.6841C253.965 23.8143 258.341 14.7301 268.384 14.7301C272.473 14.7301 276.058 16.2306 278.642 19.5959V1.14453H278.638ZM278.638 34.9048V32.0454C278.638 24.7489 275.121 20.4576 269.24 20.4576C263.359 20.4576 259.773 24.676 259.773 32.7613V34.3346C259.773 42.0598 263.573 46.5655 269.24 46.5655C274.906 46.5655 278.638 42.0598 278.638 34.9091V34.9048Z",
  "M287.605 5.29412C287.605 3.29209 289.256 1.71875 291.191 1.71875C293.126 1.71875 294.85 3.29209 294.85 5.29412C294.85 7.29616 293.199 8.8695 291.191 8.8695C289.183 8.8695 287.605 7.29616 287.605 5.29412ZM294.205 51.2124H288.25V15.5915H294.205V51.2124Z",
  "M328.197 29.2545V51.2126H322.389V30.3263C322.389 23.2441 317.728 20.6719 313.279 20.6719C307.613 20.6719 303.812 24.9632 303.812 30.6864V51.2126H298.004V15.5918H302.449L303.382 19.6687C306.465 16.0934 310.699 14.7344 314.07 14.7344C320.884 14.7344 328.201 19.4544 328.201 29.2545H328.197Z",
  "M353.809 45.9182C361.126 45.9182 366.001 47.4915 366.001 53.7162C366.001 61.3 358.684 65.5913 348.426 65.5184C338.529 65.4455 332.644 61.5143 332.644 54.3593C332.644 52.2158 333.362 50.2095 334.51 48.5675C332.717 46.8527 331.711 44.5635 331.711 42.1284C331.711 39.3376 333.147 36.0494 336.371 34.4032C335.223 32.4741 334.578 30.2534 334.578 27.7498C334.578 20.3847 340.963 14.7344 348.852 14.7344H365.133V19.8145H359.539C361.19 21.8894 362.192 24.5345 362.192 27.7541C362.192 35.2649 356.169 40.9152 348.422 40.9152C345.481 40.9152 342.755 40.1264 340.533 38.6988C338.667 39.269 337.592 40.4136 337.592 42.1327C337.592 44.422 339.815 45.9224 342.687 45.9224H353.804L353.809 45.9182ZM360.193 54.2135C360.193 51.4956 357.828 51.2083 352.519 51.2083H341.401C340.829 51.2083 340.253 51.1355 339.682 51.0669C338.822 52.07 338.392 53.1418 338.392 54.355C338.392 58.2905 341.904 60.1468 348.435 60.1468C355.391 60.1468 360.197 57.7846 360.197 54.2092L360.193 54.2135ZM340.18 27.7498C340.18 32.2554 343.624 35.6893 348.43 35.6893C353.237 35.6893 356.68 32.3283 356.68 27.7498C356.68 23.4585 353.452 20.1703 348.503 20.1703C343.555 20.1703 340.185 23.5313 340.185 27.7498H340.18Z",
];
const LOGO_PATH_GG = "M120.751 38.2444C119.72 40.928 117.914 43.1573 115.648 44.7092C113.387 46.2611 110.657 47.1399 107.772 47.1399C103.933 47.1399 100.459 45.588 97.9443 43.0801C95.4293 40.5722 93.873 37.1083 93.873 33.28C93.873 29.4517 95.4293 25.9878 97.9443 23.4799C100.459 20.972 103.933 19.4201 107.772 19.4201C109.66 19.4201 111.491 19.793 113.172 20.5004C114.268 20.9591 115.304 21.5636 116.259 22.2967C115.898 24.6674 114.935 26.8666 113.503 28.7058C111.693 31.0336 109.131 32.787 106.108 33.5972C105.15 33.8545 104.178 34.0088 103.211 34.056C102.226 34.1074 101.246 34.056 100.283 33.8973C108.099 42.7372 120.919 31.5309 121.026 20.3889C119.285 18.6098 117.217 17.2165 114.96 16.2691C112.695 15.3174 110.253 14.8115 107.772 14.8115C102.656 14.8115 98.026 16.8779 94.6727 20.2217C91.3193 23.5656 89.2471 28.1827 89.2471 33.2843C89.2471 33.6701 89.2815 34.0517 89.3073 34.4332C89.2858 34.4118 89.2686 34.3903 89.2471 34.3689C89.2729 34.3946 89.2815 34.4332 89.3073 34.4589C89.346 35.0677 89.4148 35.6636 89.5094 36.2552C88.7355 39.0846 84.5009 43.4917 82.7253 44.7092C80.464 46.2611 77.734 47.1399 74.8493 47.1399C71.0101 47.1399 67.5364 45.588 65.0214 43.0801C62.5064 40.5722 60.9501 37.1083 60.9501 33.28C60.9501 29.4517 62.5064 25.9878 65.0214 23.4799C67.5364 20.972 71.0101 19.4201 74.8493 19.4201C76.7366 19.4201 78.568 19.793 80.249 20.5004C81.3453 20.9591 82.3814 21.5636 83.3358 22.2967C82.9747 24.6674 82.0117 26.8666 80.5801 28.7058C78.7701 31.0336 76.2078 32.787 73.1855 33.5972C72.2268 33.8545 71.2552 34.0088 70.2879 34.056C69.3034 34.1074 68.3232 34.056 67.3601 33.8973C75.176 42.7372 87.9961 31.5309 88.1036 20.3889C86.3624 18.6098 84.2945 17.2165 82.0375 16.2691C79.7718 15.3174 77.3299 14.8115 74.8493 14.8115C69.7333 14.8115 65.1031 16.8779 61.7498 20.2217C58.3964 23.5656 56.3242 28.1827 56.3242 33.2843C56.3242 38.3858 58.3964 43.003 61.7498 46.3468C65.1031 49.6907 69.7333 51.7571 74.8493 51.7571C79.9653 51.7571 87.6221 48.9619 91.3838 41.8841C92.2566 43.5346 93.3614 45.0393 94.6727 46.3468C98.026 49.6907 102.656 51.7571 107.772 51.7571C115.128 51.7571 123.039 46.7498 120.751 38.2444Z";

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
  companyAddress?: string,
  clientPersonName?: string,
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

  function dr(page: ReturnType<typeof pdfDoc.addPage>, x: number, y: number, w: number, h: number, color: { r: number; g: number; b: number }, opacity = 1, borderColor?: { r: number; g: number; b: number }, borderWidth = 0, radius = 0) {
    page.drawRectangle({
      x, y, width: w, height: h,
      color: rgb(color.r, color.g, color.b),
      opacity,
      ...(borderColor ? { borderColor: rgb(borderColor.r, borderColor.g, borderColor.b), borderWidth } : {}),
      ...(radius > 0 ? { borderRadius: radius } : {}),
    });
  }

  function drawLogo(page: ReturnType<typeof pdfDoc.addPage>, x: number, baseY: number, scale: number) {
    const svgH = 66;
    for (const path of LOGO_PATHS_WHITE) {
      page.drawSvgPath(path, {
        x,
        y: baseY + svgH * scale,
        scale,
        color: rgb(1, 1, 1),
      });
    }
    page.drawSvgPath(LOGO_PATH_GG, {
      x,
      y: baseY + svgH * scale,
      scale,
      color: rgb(0.149, 0.655, 0.282),
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
    const headerH = 84;
    dr(page, 0, topY - headerH, W, headerH, C.DARK);

    // Logo rendered height = svgH * scale = 66 * 0.38 ≈ 25pt
    const logoRenderH = 66 * LOGO_SCALE;
    const logoCentreY = topY - headerH / 2;
    const logoBaseY = logoCentreY - logoRenderH / 2 + 2;
    drawLogo(page, PL, logoBaseY, LOGO_SCALE);
    const subText = 'Finance Solutions for Clean Energy';
    dt(page, subText, PL, logoBaseY - 4, 7.5, false, { r: 1, g: 1, b: 1 }, 0.5);

    const qnLabel = 'Finance Proposal';
    const qnLabelW = tw(qnLabel, false, 7.5);
    dt(page, qnLabel, W - PR - qnLabelW, topY - 20, 7.5, false, { r: 1, g: 1, b: 1 }, 0.55);
    const qnW = tw(quoteNumber, true, 15);
    dt(page, quoteNumber, W - PR - qnW, topY - 36, 15, true, C.WHITE);
    const qdW = tw(quoteDate, false, 8.5);
    dt(page, quoteDate, W - PR - qdW, topY - 56, 8.5, false, { r: 1, g: 1, b: 1 }, 0.5);

    return topY - headerH;
  }

  function drawMiniHeader(page: ReturnType<typeof pdfDoc.addPage>, topY: number): number {
    const headerH = 56;
    dr(page, 0, topY - headerH, W, headerH, C.DARK);

    const miniScale = 0.32;
    const logoRenderH2 = 66 * miniScale;
    const logoCentreY2 = topY - headerH / 2;
    const logoBaseY2 = logoCentreY2 - logoRenderH2 / 2 + 2;
    drawLogo(page, PL, logoBaseY2, miniScale);
    const subText2 = 'Finance Solutions for Clean Energy';
    dt(page, subText2, PL, logoBaseY2 - 3, 6.5, false, { r: 1, g: 1, b: 1 }, 0.45);
    const qnW = tw(quoteNumber, false, 7.5);
    dt(page, quoteNumber, W - PR - qnW, topY - 20, 7.5, false, { r: 1, g: 1, b: 1 }, 0.55);
    const qdW = tw(quoteDate, false, 7);
    dt(page, quoteDate, W - PR - qdW, topY - 33, 7, false, { r: 1, g: 1, b: 1 }, 0.4);

    return topY - headerH;
  }

  function drawPageFooter(page: ReturnType<typeof pdfDoc.addPage>) {
    const footerH = 24;
    const footerY = 0;
    dr(page, 0, footerY, W, footerH, C.DARK);
    const footerText = 'This quote is indicative only and subject to credit approval. Valid for 30 days.';
    const ftW = tw(footerText, false, 6.5);
    dt(page, footerText, (W - ftW) / 2, footerY + 8, 6.5, false, { r: 1, g: 1, b: 1 }, 0.5);
  }

  function drawSectionLabel(page: ReturnType<typeof pdfDoc.addPage>, label: string, x: number, y: number) {
    dr(page, x, y - 1, 3, 10, C.GREEN, 0.8);
    dt(page, label.toUpperCase(), x + 8, y, 7, true, C.GRAY_TEXT);
  }

  function drawLabelValue(page: ReturnType<typeof pdfDoc.addPage>, label: string, value: string, x: number, y: number, maxW: number): number {
    dt(page, label, x, y, 7, true, C.GRAY_TEXT);
    return dtWrapped(page, value, x, y - 12, 9, true, C.DARK_TEXT, maxW, 13);
  }

  function drawInfoCard(page: ReturnType<typeof pdfDoc.addPage>, x: number, y: number, w: number, h: number, label: string, value: string, bold: boolean, bgColor: { r: number; g: number; b: number }, labelColor: { r: number; g: number; b: number }, valueColor: { r: number; g: number; b: number }, borderColor?: { r: number; g: number; b: number }, sublabel?: string) {
    const isGreen = bgColor.r < 0.3 && bgColor.g > 0.5;
    dr(page, x, y - h, w, h, bgColor, isGreen ? 1 : 0.06, isGreen ? undefined : C.BORDER, isGreen ? 0 : 0.6, 8);
    const labelY = y - 11;
    const lW = tw(label, false, 6.5);
    dt(page, label, x + (w - lW) / 2, labelY, 6.5, false, isGreen ? { r:1,g:1,b:1 } : C.GRAY_TEXT, isGreen ? 0.85 : 1);
    const sublabelY = y - h + 9;
    if (sublabel) {
      const slW = tw(sublabel, false, 6);
      dt(page, sublabel, x + (w - slW) / 2, sublabelY, 6, false, isGreen ? { r:1,g:1,b:1 } : C.GRAY_LIGHT, 0.65);
    }
    const valueSize = bold ? 12 : 9;
    const vLines = wrapText(value, bold, valueSize, w - 12);
    const contentAreaTop = labelY - 8;
    const contentAreaBottom = sublabel ? sublabelY + 10 : y - h + 8;
    const contentAreaH = contentAreaTop - contentAreaBottom;
    const totalTextH = vLines.length * 14;
    const vStartY = contentAreaBottom + contentAreaH / 2 + totalTextH / 2 - 2;
    for (let i = 0; i < vLines.length; i++) {
      const vW = tw(vLines[i], bold, valueSize);
      dt(page, vLines[i], x + (w - vW) / 2, vStartY - i * 14, valueSize, bold, isGreen ? C.WHITE : valueColor);
    }
  }

  function drawPage1() {
    const page = pdfDoc.addPage([W, H]);
    let y = H;

    y = drawPageHeader(page, y);
    y -= 16;

    const colW = (CW - 8) / 2;
    const infoBoxH = 88;

    dl(page, PL, y, PL + CW, y, C.BORDER, 0.75);
    dl(page, PL, y - infoBoxH, PL + CW, y - infoBoxH, C.BORDER, 0.75);
    dl(page, PL + colW + 4, y - 8, PL + colW + 4, y - infoBoxH + 8, C.BORDER, 0.5);

    drawSectionLabel(page, 'Prepared By', PL, y - 12);
    let byY = y - 28;
    if (installerCompany) {
      byY -= dtWrapped(page, installerCompany, PL, byY, 9.5, true, C.DARK_TEXT, colW - 12, 14);
    }
    if (installerName && installerCompany) {
      dt(page, installerName, PL, byY, 8, false, C.GRAY_TEXT);
      byY -= 13;
    } else if (installerName) {
      byY -= dtWrapped(page, installerName, PL, byY, 9.5, true, C.DARK_TEXT, colW - 12, 14);
    }
    if (installerEmail) {
      dt(page, installerEmail, PL, byY, 7.5, false, C.GRAY_TEXT);
      byY -= 12;
    }
    if (installerPhone) {
      dt(page, installerPhone, PL, byY, 7.5, false, C.GRAY_TEXT);
    }

    const forX = PL + colW + 16;
    drawSectionLabel(page, 'Prepared For', forX, y - 12);
    let forY = y - 28;
    forY -= dtWrapped(page, recipientCompany || recipientName || '', forX, forY, 9.5, true, C.DARK_TEXT, colW - 12, 14);
    if (clientPersonName && recipientCompany) {
      dt(page, clientPersonName, forX, forY, 7.5, false, C.GRAY_TEXT);
      forY -= 12;
    }
    if (companyAddress) {
      forY -= dtWrapped(page, companyAddress, forX, forY, 7.5, false, C.GRAY_TEXT, colW - 12, 12);
    }
    if (clientEmail) {
      dt(page, clientEmail, forX, forY, 7.5, false, C.GRAY_TEXT);
      forY -= 12;
    }
    if (clientPhone) {
      dt(page, clientPhone, forX, forY, 7.5, false, C.GRAY_TEXT);
    }

    y -= infoBoxH + 20;

    drawSectionLabel(page, 'Project Summary', PL, y);
    if (siteAddress) {
      const siteLabel = 'Site: ';
      const siteLabelW = tw(siteLabel, true, 7);
      dt(page, siteLabel, PL + 80, y, 7, true, C.GRAY_TEXT);
      dt(page, siteAddress, PL + 80 + siteLabelW, y, 7, false, C.GRAY_TEXT);
    }
    y -= 14;

    const cardCount = 2 + (systemSize ? 1 : 0) + (hasSolar && annualSolarGenerationKwh ? 1 : 0);
    const cardGap = 6;
    const cardW = (CW - cardGap * (cardCount - 1)) / cardCount;
    const cardH = 56;

    drawInfoCard(page, PL, y, cardW, cardH, 'Project Cost (Inc. GST)', formatCurrencyAU(projectCost), true, C.GREEN, { r: 1, g: 1, b: 1 }, C.WHITE);

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

    if (disclaimerText) {
      const dH = 28;
      dr(page, PL, y - dH, CW, dH, C.AMBER_BG, 1, C.AMBER_BORDER, 0.75, 6);
      dtWrapped(page, disclaimerText, PL + 10, y - 10, 7.5, false, C.AMBER_TEXT, CW - 20, 11);
      y -= dH + 12;
    }

    y = drawPaymentOptionsSection(page, y);


    const effectiveEnergySavings = energySavings && energySavings > 0
      ? energySavings
      : (annualSolarGenerationKwh && annualSolarGenerationKwh > 0 ? annualSolarGenerationKwh * 0.30 : 0);

    if (effectiveEnergySavings > 0 && hasSolar) {
      drawSectionLabel(page, 'Savings Thanks to Solar', PL, y);
      y -= 18;

      const YEARS = 25;
      const GROWTH_RATE = 0.03;
      const annualLoanCost = sortedTerms[0]?.monthlyPayment ? sortedTerms[0].monthlyPayment * 12 : 0;
      const electricityBillWithSolar = effectiveEnergySavings * 0.05;
      const firstTermYears = sortedTerms[0]?.years ?? 0;

      const chartData: Array<{ year: number; billWithoutSolar: number; billWithSolar: number; loanCost: number; cumulativeSavings: number }> = [];
      let currentBill = effectiveEnergySavings;
      let cumSavings = 0;
      for (let yr = 1; yr <= YEARS; yr++) {
        const loanCostThisYear = (firstTermYears && annualLoanCost && yr <= firstTermYears) ? annualLoanCost : 0;
        const billWithSolar = electricityBillWithSolar * Math.pow(1 + GROWTH_RATE, yr - 1);
        const netSaving = currentBill - billWithSolar - loanCostThisYear;
        cumSavings += netSaving;
        chartData.push({ year: yr, billWithoutSolar: currentBill, billWithSolar, loanCost: loanCostThisYear, cumulativeSavings: cumSavings });
        currentBill *= (1 + GROWTH_RATE);
      }

      const sCardH = 48;
      const sCardGap = 8;
      const sCardCount = 3;
      const sCardW = (CW - sCardGap * (sCardCount - 1)) / sCardCount;

      // Card 1 — dark
      dr(page, PL, y - sCardH, sCardW, sCardH, C.DARK, 1, undefined, 0, 8);
      const c1Label = 'Without solar';
      const c1LabelW = tw(c1Label, false, 6.5);
      dt(page, c1Label, PL + (sCardW - c1LabelW) / 2, y - 11, 6.5, false, C.WHITE, 0.6);
      const c1Val = formatCurrencyAU(effectiveEnergySavings) + '/yr';
      const c1ValW = tw(c1Val, true, 10);
      dt(page, c1Val, PL + (sCardW - c1ValW) / 2, y - 29, 10, true, C.WHITE);

      // Card 2 — teal tint
      dr(page, PL + sCardW + sCardGap, y - sCardH, sCardW, sCardH, C.TEAL, 0.1, C.TEAL, 0.25, 8);
      const c2Label = 'With solar';
      const c2LabelW = tw(c2Label, false, 6.5);
      dt(page, c2Label, PL + sCardW + sCardGap + (sCardW - c2LabelW) / 2, y - 11, 6.5, false, C.TEAL, 0.9);
      const c2Val = formatCurrencyAU(electricityBillWithSolar) + '/yr';
      const c2ValW = tw(c2Val, true, 10);
      dt(page, c2Val, PL + sCardW + sCardGap + (sCardW - c2ValW) / 2, y - 29, 10, true, C.TEAL);

      // Card 3 — green tint
      dr(page, PL + (sCardW + sCardGap) * 2, y - sCardH, sCardW, sCardH, C.GREEN, 0.08, C.GREEN, 0.25, 8);
      const c3Label = firstTermYears ? `Finance payments/yr` : '25-yr net savings';
      const c3LabelW = tw(c3Label, false, 6.5);
      dt(page, c3Label, PL + (sCardW + sCardGap) * 2 + (sCardW - c3LabelW) / 2, y - 11, 6.5, false, C.GREEN, 0.9);
      const c3Val = firstTermYears ? formatCurrencyAU(annualLoanCost) + '/yr' : formatCurrencyAU(chartData[YEARS - 1].cumulativeSavings);
      const c3ValW = tw(c3Val, true, 10);
      dt(page, c3Val, PL + (sCardW + sCardGap) * 2 + (sCardW - c3ValW) / 2, y - 29, 10, true, C.GREEN);

      y -= sCardH + 14;

      const legendItems = [
        { label: 'Electricity bill without solar', color: C.DARK },
        { label: 'Electricity bill with solar', color: C.TEAL },
        ...(firstTermYears ? [{ label: 'Payment plan instalments', color: C.GREEN }] : []),
      ];
      let lx = PL;
      for (const li of legendItems) {
        dr(page, lx, y - 8, 10, 10, li.color, 1, undefined, 0, 3);
        dt(page, li.label, lx + 14, y - 1, 7, false, C.GRAY_TEXT);
        lx += 14 + tw(li.label, false, 7) + 16;
      }
      y -= 18;

      const chartH = 160;
      const chartPL = 52;
      const chartPR = 10;
      const chartPTop = 10;
      const chartPBot = 28;
      const plotW = CW - chartPL - chartPR;
      const plotH = chartH - chartPTop - chartPBot;

      const maxVal = Math.max(...chartData.map(d => Math.max(d.billWithoutSolar, d.billWithSolar, d.loanCost)));
      const rawYMax = Math.ceil(maxVal / 1000) * 1000 || 1;
      const yMax = Math.ceil(rawYMax / 5) * 5 || 1;
      const yTicks = [0, 1, 2, 3, 4, 5].map(i => (yMax / 5) * i);

      const chartBaseX = PL + chartPL;
      const chartBaseY = y - chartH + chartPBot;

      for (const tick of yTicks) {
        const tickY = chartBaseY + (tick / yMax) * plotH;
        dl(page, chartBaseX, tickY, chartBaseX + plotW, tickY, C.BORDER, 0.5);
        const tickLabel = tick >= 1000 ? `$${(tick / 1000).toFixed(0)}k` : `$${tick}`;
        const tlW = tw(tickLabel, false, 6);
        dt(page, tickLabel, chartBaseX - tlW - 3, tickY - 2, 6, false, C.GRAY_LIGHT);
      }

      const barGroupW = plotW / YEARS;
      const numBars = firstTermYears ? 3 : 2;
      const totalBarSpace = barGroupW * 0.78;
      const barW = totalBarSpace / numBars;
      const barGap = barGroupW * 0.04;

      for (let i = 0; i < chartData.length; i++) {
        const d = chartData[i];
        const groupStartX = chartBaseX + i * barGroupW + (barGroupW - totalBarSpace) / 2;

        const bh0 = Math.max(0, (d.billWithoutSolar / yMax) * plotH);
        dr(page, groupStartX, chartBaseY + (d.billWithoutSolar / yMax) * plotH - bh0, barW, bh0, C.DARK, 0.9);

        const bh1 = Math.max(0, (d.billWithSolar / yMax) * plotH);
        dr(page, groupStartX + barW + barGap, chartBaseY + (d.billWithSolar / yMax) * plotH - bh1, barW, bh1, C.TEAL, 0.85);

        if (firstTermYears && d.loanCost > 0) {
          const bh2 = Math.max(0, (d.loanCost / yMax) * plotH);
          dr(page, groupStartX + (barW + barGap) * 2, chartBaseY + (d.loanCost / yMax) * plotH - bh2, barW, bh2, C.GREEN, 0.9);
        }

        if (d.year === 1 || d.year % 5 === 0) {
          const labelX = chartBaseX + i * barGroupW + barGroupW / 2;
          const lyW = tw(String(d.year), false, 7);
          dt(page, String(d.year), labelX - lyW / 2, chartBaseY - 14, 7, false, C.GRAY_TEXT);
        }
      }

      dl(page, chartBaseX, chartBaseY, chartBaseX + plotW, chartBaseY, C.BORDER2, 0.75);

      const yearsLabelW = tw('Years', false, 7);
      dt(page, 'Years', chartBaseX + plotW / 2 - yearsLabelW / 2, chartBaseY - 22, 7, false, C.GRAY_LIGHT);

      y -= chartH + 12;

      if (firstTermYears) {
        const savingsAtEnd = chartData[firstTermYears - 1]?.billWithoutSolar ?? effectiveEnergySavings;
        const postLoanNote = `After year ${firstTermYears}, your finance payments end. Your electricity savings of ${formatCurrencyAU(savingsAtEnd)}/year are yours to keep — and growing every year.`;
        dt(page, postLoanNote, PL, y - 8, 7.5, false, C.GREEN);
        y -= 20;
      }

      drawSectionLabel(page, 'Estimated Cumulative Savings', PL, y);
      y -= 14;

      dl(page, PL, y, PL + CW, y, C.BORDER, 0.75);
      y -= 6;

      const colBoxes = [
        {
          label: firstTermYears ? `Over ${firstTermYears} years` : 'Over 25 years',
          sublabel: firstTermYears ? 'Period of facility' : '25-year projection',
          value: chartData[(firstTermYears ?? YEARS) - 1]?.cumulativeSavings ?? 0,
        },
        { label: 'Over 15 years', sublabel: '15-year projection', value: chartData[14]?.cumulativeSavings ?? 0 },
        { label: 'Over 25 years', sublabel: '25-year projection', value: chartData[24]?.cumulativeSavings ?? 0 },
      ];

      const colW3 = CW / 3;
      const cumRowH = 52;
      for (let ci = 0; ci < colBoxes.length; ci++) {
        const box = colBoxes[ci];
        const cx = PL + colW3 * ci;
        if (ci > 0) dl(page, cx, y, cx, y - cumRowH, C.BORDER, 0.4);
        const subLabelW = tw(box.sublabel, false, 6.5);
        dt(page, box.sublabel, cx + (colW3 - subLabelW) / 2, y - 8, 6.5, false, C.GRAY_LIGHT);
        const mainLabelW = tw(box.label, true, 8.5);
        dt(page, box.label, cx + (colW3 - mainLabelW) / 2, y - 20, 8.5, true, C.DARK_TEXT);
        const valColor = box.value >= 0 ? C.GREEN : hexToRgb('#ef4444');
        const valText = formatCurrencyAU(box.value);
        const valW = tw(valText, true, 14);
        dt(page, valText, cx + (colW3 - valW) / 2, y - 40, 14, true, valColor);
      }

      y -= cumRowH;
      dl(page, PL, y, PL + CW, y, C.BORDER, 0.75);
      y -= 10;

      const indicativeNote = '* Indicative only. Based on 3% annual energy price growth.';
      const inW = tw(indicativeNote, false, 6.5);
      dt(page, indicativeNote, PL + CW - inW, y - 4, 6.5, false, C.GRAY_LIGHT);
      y -= 18;
    }

    drawPageFooter(page);
  }

  function drawPaymentOptionsSection(page: ReturnType<typeof pdfDoc.addPage>, y: number): number {
    drawSectionLabel(page, 'Payment Options', PL, y);
    y -= 16;

    const rowH = 40;
    const tableBodyH = rowH * sortedTerms.length;

    dl(page, PL, y, PL + CW, y, C.BORDER, 0.75);

    dt(page, 'Loan Term', PL, y - 10, 6.5, true, C.GRAY_TEXT);
    dt(page, 'Monthly Payment (Ex. GST)', W - PR - tw('Monthly Payment (Ex. GST)', true, 6.5), y - 10, 6.5, true, C.GRAY_TEXT);

    y -= 18;
    dl(page, PL, y, PL + CW, y, C.BORDER, 0.4);
    y -= 2;

    sortedTerms.forEach((t, i) => {
      const rowY = y - rowH * i;
      if (i > 0) dl(page, PL, rowY, PL + CW, rowY, C.BORDER, 0.35);

      const dotX = PL + 6;
      const dotY = rowY - rowH / 2 - 1;
      page.drawCircle({ x: dotX, y: dotY, size: 3.5, color: rgb(C.GREEN.r, C.GREEN.g, C.GREEN.b) });

      const termLabel = `${t.years} Year${t.years !== 1 ? 's' : ''}`;
      dt(page, termLabel, PL + 18, rowY - rowH / 2 - 4, 11, true, C.DARK_TEXT);

      const amtText = formatCurrencyDecimals(t.monthlyPayment);
      const amtW = tw(amtText, true, 14);

      if (t.costPerKwhCents && t.costPerKwhCents > 0) {
        dt(page, amtText, W - PR - amtW - 28, rowY - rowH / 2 - 1, 14, true, C.GREEN);
        dt(page, '/mo', W - PR - 22, rowY - rowH / 2 + 1, 7.5, false, C.GRAY_LIGHT);
        const kwhText = `Estimate per kWh: ${t.costPerKwhCents.toFixed(2)}¢`;
        const kwhW = tw(kwhText, false, 6.5);
        dt(page, kwhText, W - PR - kwhW - 22, rowY - rowH / 2 - 13, 6.5, false, C.GRAY_LIGHT);
      } else {
        dt(page, amtText, W - PR - amtW - 28, rowY - rowH / 2 - 5, 14, true, C.GREEN);
        dt(page, '/mo', W - PR - 22, rowY - rowH / 2 - 3, 7.5, false, C.GRAY_LIGHT);
      }
    });

    y -= rowH * sortedTerms.length;
    dl(page, PL, y, PL + CW, y, C.BORDER, 0.75);
    y -= 12;

    const noteText = `* Quote valid for 30 days from ${quoteDate}.`;
    dt(page, noteText, PL, y - 4, 7, false, C.GRAY_LIGHT);
    y -= 14;
    if (hasSolar && annualSolarGenerationKwh) {
      const kwhNote = '* Cents per kWh shown for comparison only. Billing is based on fixed monthly installments.';
      dtWrapped(page, kwhNote, PL, y - 4, 7, false, C.GRAY_LIGHT, CW, 11);
      y -= 16;
    }
    y -= 8;

    return y;
  }

  function drawPage2() {
    const page = pdfDoc.addPage([W, H]);
    let y = H;

    y = drawMiniHeader(page, y);
    y -= 20;


    drawSectionLabel(page, "What You'll Need to Apply", PL, y);
    y -= 24;

    if (isLowDoc) {
      let lowDocTitle: string;
      let lowDocItems: Array<{ label: string; url?: string }>;

      if (projectCost >= 150000) {
        lowDocTitle = 'Low Doc Requirements ($150k\u2013$250k)';
        lowDocItems = [
          { label: "Directors Drivers Licence & Medicare card" },
          { label: '6 months Bank Statements', url: 'scv.bankstatements.com.au/HSHV', urlLabel: 'Statements Portal' },
          { label: 'Privacy Consent', url: 'drive.google.com' },
          { label: 'Asset and Liability statement', url: 'drive.google.com' },
        ];
      } else {
        lowDocTitle = 'Low Doc Requirements (up to $150k)';
        lowDocItems = [
          { label: "Directors Drivers Licence & Medicare card" },
          { label: 'Privacy Consent', url: 'drive.google.com' },
          { label: 'Asset and Liability statement', url: 'drive.google.com' },
        ];
      }

      dt(page, lowDocTitle, PL, y, 10, true, C.DARK_TEXT);
      y -= 16;

      for (const item of lowDocItems) {
        const rowH = 28;
        dr(page, PL, y - rowH, CW, rowH, C.GRAY_BG, 1, C.BORDER, 0.75, 6);
        page.drawCircle({ x: PL + 14, y: y - rowH / 2 - 1, size: 6, color: rgb(C.GREEN.r, C.GREEN.g, C.GREEN.b) });
        dt(page, 'v', PL + 10.5, y - rowH / 2 - 3.5, 7, true, C.WHITE);
        const maxItemW = CW - 30 - (item.url ? 90 : 0);
        dtWrapped(page, item.label, PL + 26, y - rowH / 2 - 3, 8.5, false, C.DARK_TEXT, maxItemW, 12);
        if (item.url) {
          const linkLabel = `[${item.urlLabel ?? 'Download'}]`;
          dt(page, linkLabel, W - PR - tw(linkLabel, false, 7.5), y - rowH / 2 - 3, 7.5, false, C.GREEN);
        }
        y -= rowH + 4;
      }
    } else {
      dt(page, 'Full Doc Requirements', PL, y, 10, true, C.DARK_TEXT);
      y -= 16;

      const fullDocRows: Array<{ document: string; u500: boolean; m500: boolean; o1m: boolean; url?: string }> = [
        { document: 'FY24 & FY25 Accountant prepared financials', u500: true, m500: true, o1m: true },
        { document: 'Mgt YTD Dec 25 Financials', u500: true, m500: true, o1m: true },
        { document: 'Finance Commitment Schedule', u500: true, m500: true, o1m: true },
        { document: 'Current ATO Portal Statement', u500: true, m500: true, o1m: true },
        { document: 'Business Overview and Major Clients', u500: true, m500: true, o1m: true },
        { document: 'Asset and Liability', u500: true, m500: true, o1m: true, url: 'drive.google.com' },
        { document: 'Privacy Consent', u500: true, m500: true, o1m: true, url: 'drive.google.com' },
        { document: 'Aged Debtors and Creditors', u500: false, m500: true, o1m: true },
        { document: 'Cashflow Projections', u500: false, m500: false, o1m: true },
      ];

      const tableHeaderH = 28;
      const docRowH = 26;
      const docBodyH = docRowH * fullDocRows.length;
      const docTotalH = tableHeaderH + docBodyH;
      dr(page, PL, y - docTotalH, CW, docTotalH, C.WHITE, 1, C.BORDER, 0.75, 8);
      dr(page, PL, y - tableHeaderH, CW, tableHeaderH, C.DARK, 1, undefined, 0, 8);
      dr(page, PL, y - tableHeaderH, CW, tableHeaderH / 2 + 2, C.DARK);

      const docColW = CW * 0.55;
      const checkColW = (CW - docColW) / 3;

      dt(page, 'Document', PL + 12, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
      dt(page, '<$500k', PL + docColW + checkColW / 2 - tw('<$500k', true, 7.5) / 2, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
      dt(page, '$500k\u2013$1m', PL + docColW + checkColW * 1.5 - tw('$500k\u2013$1m', true, 7.5) / 2, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);
      dt(page, '$1m+', PL + docColW + checkColW * 2.5 - tw('$1m+', true, 7.5) / 2, y - 11, 7.5, true, { r: 1, g: 1, b: 1 }, 0.8);

      y -= tableHeaderH;

      fullDocRows.forEach((row, i) => {
        const rowH = docRowH;
        const rowY = y - rowH * i;
        if (i % 2 !== 0) dr(page, PL, rowY - rowH, CW, rowH, C.GRAY_BG2);
        if (i > 0) dl(page, PL + 10, rowY, PL + CW - 10, rowY, C.BORDER, 0.4);

        const isApplicable =
          (projectCost < 500000 && row.u500) ||
          (projectCost >= 500000 && projectCost < 1000000 && row.m500) ||
          (projectCost >= 1000000 && row.o1m);

        const maxDocW = docColW - 20 - (row.url ? tw('[Download]', false, 7.5) + 8 : 0);
        dt(page, row.document, PL + 10, rowY - rowH / 2 - 3.5, 8, false, isApplicable ? C.DARK_TEXT : C.GRAY_LIGHT);
        if (row.url) {
          const linkLabel = '[Download]';
          dt(page, linkLabel, PL + docColW - tw(linkLabel, false, 7.5) - 8, rowY - rowH / 2 - 3.5, 7.5, false, C.GREEN);
        }

        [[row.u500, 0.5], [row.m500, 1.5], [row.o1m, 2.5]].forEach(([val, multiplier]) => {
          const cx = PL + docColW + checkColW * (multiplier as number);
          const cy = rowY - rowH / 2;
          const r = 7;
          if (val) {
            page.drawCircle({ x: cx, y: cy, size: r, color: rgb(C.GREEN_LIGHT.r, C.GREEN_LIGHT.g, C.GREEN_LIGHT.b) });
            dt(page, 'v', cx - 3.5, cy - 3, 8, true, C.GREEN);
          } else {
            page.drawCircle({ x: cx, y: cy, size: r, color: rgb(0.99, 0.9, 0.9) });
            dt(page, 'x', cx - 3, cy - 3.5, 8, true, { r: 0.8, g: 0.2, b: 0.2 });
          }
        });
      });

      y -= docRowH * fullDocRows.length;
    }

    y -= 16;

    const disclaimerText = 'Disclaimer  The repayment amounts and any other financial information set out in this document are indicative only and provided for illustrative purposes. They do not constitute a commitment, approval, or offer of finance. Final terms, including pricing and repayments, are subject to the submission of a formal application and approval by Green Funding in accordance with its lending criteria, terms, and conditions. This document is provided for information purposes only and does not constitute financial product advice, investment advice, or taxation advice, nor a recommendation. It has been prepared without taking into account the objectives, financial situation, or needs of any recipient. Recipients should make their own assessment and obtain appropriate independent advice before acting. Any projections, forecasts, models, or illustrative materials (including graphs) are based on information obtained from third parties and a range of assumptions, which have not been independently verified. Those assumptions may change, and actual outcomes may differ due to factors including changes in market conditions, regulations, energy pricing, inflation, interest rates, and site-specific variables. All applications are subject to standard approval criteria. Terms and conditions apply.';
    const disclaimerLineH = 9;
    const disclaimerLines = wrapText(disclaimerText, false, 6, CW - 8);
    const disclaimerH = disclaimerLines.length * disclaimerLineH + 12;
    dr(page, PL, y - disclaimerH, CW, disclaimerH, { r: 0.98, g: 0.98, b: 0.98 }, 1, C.BORDER, 0.5, 4);
    let dY = y - 8;
    for (const line of disclaimerLines) {
      dt(page, line, PL + 6, dY, 6, false, { r: 0.5, g: 0.5, b: 0.5 });
      dY -= disclaimerLineH;
    }
    y -= disclaimerH + 12;

    const getStartedH = 64;
    dr(page, PL, y - getStartedH, CW, getStartedH, C.GRAY_BG, 1, C.BORDER, 0.75, 6);

    drawSectionLabel(page, 'Get Started', PL + 14, y - 10);
    const contactText = 'Contact your Green Funding representative to begin the application process.';
    dtWrapped(page, contactText, PL + 14, y - 22, 8, false, C.GRAY_TEXT, CW / 2 - 20, 12);

    const contactRightX = PL + CW / 2 + 14;
    dt(page, 'Phone:', contactRightX, y - 22, 8, true, C.DARK_TEXT);
    dt(page, '1300 403 100', contactRightX + tw('Phone: ', true, 8), y - 22, 8, false, C.GRAY_TEXT);
    dt(page, 'Email:', contactRightX, y - 34, 8, true, C.DARK_TEXT);
    dt(page, 'solutions@greenfunding.com.au', contactRightX + tw('Email: ', true, 8), y - 34, 8, false, C.GRAY_TEXT);
    dt(page, 'Web:', contactRightX, y - 46, 8, true, C.DARK_TEXT);
    dt(page, 'www.greenfunding.com.au', contactRightX + tw('Web: ', true, 8), y - 46, 8, false, C.GRAY_TEXT);

    y -= getStartedH + 16;

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
    from: 'Green Funding Portal <noreply@portal.greenfunding.com.au>',
    reply_to: 'solutions@greenfunding.com.au',
    to: [to],
    subject,
    html: htmlBody,
  };

  if (attachment) {
    body.attachments = [
      {
        content: attachment.content,
        filename: attachment.name,
        type: 'application/pdf',
      },
    ];
  }

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
      companyAddress,
      systemSize,
      clientPhone,
      clientPersonName,
      abn,
      natureOfBusiness,
      entityName,
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
      currentElectricityBill,
      anticipatedElectricityBillWithSolar,
      disclaimerText,
      installerEmail: payloadInstallerEmail,
      installerPhone: payloadInstallerPhone,
      quoteId: payloadQuoteId,
    } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle send-link mode: email a unique review link to the client
    if (mode === 'send-link') {
      if (!payloadQuoteId) {
        return new Response(JSON.stringify({ error: 'quoteId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: quote } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, recipient_email, recipient_name, recipient_company, project_cost, pdf_url')
        .eq('id', payloadQuoteId)
        .maybeSingle();
      if (!quote || !quote.recipient_email) {
        return new Response(JSON.stringify({ error: 'Quote not found or missing email' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: updatedQuote } = await supabase
        .from('sent_quotes')
        .update({ portal_access_code: accessCode, upload_token_expires_at: tokenExpiry })
        .eq('id', payloadQuoteId)
        .select('upload_token')
        .maybeSingle();
      const appUrl = Deno.env.get('APP_URL') || 'https://portal.greenfunding.com.au';
      const reviewUrl = `${appUrl}/review-quote/${payloadQuoteId}`;
      const qNum = formatQuoteNumber(quote.quote_number);
      const clientName = quote.recipient_company || quote.recipient_name || 'Valued Customer';
      const resendApiKey = await getResendApiKey(supabase);
      if (!resendApiKey) {
        return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const linkEmailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:0;background:#f0f2f0;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
  <tr><td style="background-color:#094325;padding:36px 40px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td><img src="https://portal.greenfunding.com.au/green-funding-invertedlogo.svg" alt="Green Funding" height="34" style="display:block;height:34px;" onerror="this.style.display='none'" /></td>
      <td align="right"><span style="font-size:11px;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;letter-spacing:0.5px;">FINANCE PROPOSAL</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:40px 40px 32px;">
    <p style="font-size:22px;font-weight:700;color:#094325;margin:0 0 8px;font-family:Arial,sans-serif;">Your Proposal is Ready</p>
    <p style="font-size:15px;color:#6B7280;margin:0 0 28px;font-family:Arial,sans-serif;">Reference: <strong style="color:#3A475B;">${qNum}</strong></p>
    <p style="font-size:15px;color:#3A475B;margin:0 0 16px;line-height:1.6;font-family:Arial,sans-serif;">Dear ${clientName},</p>
    <p style="font-size:15px;color:#4B5563;margin:0 0 28px;line-height:1.7;font-family:Arial,sans-serif;">Your Green Funding finance proposal is ready for your review. Please use the button below to view your personalised proposal and approve when you are ready to proceed.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:20px 24px;display:inline-block;">
        <p style="font-size:12px;color:#9CA3AF;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;">Your Access Code</p>
        <p style="font-size:28px;font-weight:700;color:#094325;letter-spacing:8px;margin:0;font-family:Arial,sans-serif;">${accessCode}</p>
      </div>
    </td></tr></table>
    <p style="font-size:13px;color:#9CA3AF;margin:0 0 28px;font-family:Arial,sans-serif;">This link is valid for 30 days.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#28AA48;border-radius:10px;">
      <a href="${reviewUrl}" style="display:inline-block;background-color:#28AA48;color:#ffffff;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:0.3px;mso-padding-alt:0;">Review Proposal</a>
    </td></tr></table>
    <p style="font-size:12px;color:#9CA3AF;margin:24px 0 0;font-family:Arial,sans-serif;word-break:break-all;">Or copy this link: <a href="${reviewUrl}" style="color:#28AA48;">${reviewUrl}</a></p>
  </td></tr>
  <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:24px 40px;">
    <table cellpadding="0" cellspacing="0" width="100%"><tr>
      <td><p style="font-size:13px;font-weight:700;color:#094325;margin:0;font-family:Arial,sans-serif;">Green Funding</p></td>
      <td align="right"><p style="font-size:12px;color:#9CA3AF;margin:0;font-family:Arial,sans-serif;">1300 403 100 &nbsp;|&nbsp; <a href="mailto:solutions@greenfunding.com.au" style="color:#28AA48;text-decoration:none;">solutions@greenfunding.com.au</a></p></td>
    </tr></table>
  </td></tr>
</table></td></tr></table></body></html>`;
      const emailRes = await sendEmail(resendApiKey, quote.recipient_email, `Your Green Funding Proposal ${qNum} is Ready`, linkEmailHtml);
      if (!emailRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, quoteNumber: qNum }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!termOptions || termOptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'termOptions are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        company_address: companyAddress || null,
        system_size: systemSize || null,
        client_phone: clientPhone || null,
        client_person_name: clientPersonName || null,
        abn: abn || null,
        nature_of_business: natureOfBusiness || null,
        entity_name: entityName || null,
        project_cost: projectCost,
        selected_asset_ids: assetIds,
        asset_names: assetNames,
        term_options: termOptions,
        payment_timing: paymentTiming || 'arrears',
        calculator_type: calculatorType || 'rental',
        annual_solar_generation_kwh: annualSolarGenerationKwh || null,
        energy_savings: energySavings || null,
        current_electricity_bill: currentElectricityBill || null,
        anticipated_electricity_bill_with_solar: anticipatedElectricityBillWithSolar ?? null,
        requires_admin_review: projectCost >= 1000000,
        admin_review_status: projectCost >= 1000000 ? 'pending_review' : null,
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

    // Fire admin notification for large proposals (non-blocking)
    if (projectCost >= 1000000) {
      EdgeRuntime.waitUntil((async () => {
        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-large-proposal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ quoteId: quoteRecord.id }),
          });
        } catch (e) {
          console.error('Failed to send large proposal admin notification:', e);
        }
      })());
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
      companyAddress,
      clientPersonName,
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

    const resendApiKey = await getResendApiKey(supabase);

    if (!resendApiKey) {
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
      const introResponse = await sendEmail(resendApiKey, recipientEmail, introSubject, introHtml);
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
        await sendEmail(resendApiKey, recipientEmail, quoteSubjectLine, quoteEmailHtml, {
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

    const quoteResponse = await sendEmail(resendApiKey, recipientEmail, quoteSubjectLine, quoteEmailHtml, {
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
