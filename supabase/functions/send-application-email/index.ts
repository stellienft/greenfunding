import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'Application ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (fetchError || !application) {
      return new Response(
        JSON.stringify({ error: 'Application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let installerInfo = null;
    if (application.installer_id) {
      const { data: installer, error: installerError } = await supabase
        .from('installer_users')
        .select('full_name, company_name, application_count, email')
        .eq('id', application.installer_id)
        .maybeSingle();

      if (!installerError && installer) {
        installerInfo = installer;
      }
    }

    const assetIds = application.selected_assets || [];
    let assetNames = [];

    if (assetIds.length > 0) {
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id, name')
        .in('id', assetIds);

      if (!assetsError && assets) {
        assetNames = assets.map(asset => asset.name);
      }
    }

    const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');

    if (!elasticEmailApiKey) {
      console.error('ELASTIC_EMAIL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
      }).format(amount);
    };

    const equipmentType = assetNames.length > 0
      ? assetNames.join(' & ')
      : 'Equipment';

    const documentLinks = [];

    if (application.uploaded_documents && application.uploaded_documents.length > 0) {
      for (const doc of application.uploaded_documents) {
        try {
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from('application-documents')
            .createSignedUrl(doc.path, 604800);

          if (!urlError && signedUrl) {
            documentLinks.push({
              name: doc.name,
              url: signedUrl.signedUrl,
              size: doc.size,
            });
          }
        } catch (error) {
          console.error(`Error creating signed URL for ${doc.name}:`, error);
        }
      }
    }

    let privacyConsentLink = null;
    if (application.privacy_consent_file) {
      try {
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('application-documents')
          .createSignedUrl(application.privacy_consent_file.path, 604800);

        if (!urlError && signedUrl) {
          privacyConsentLink = {
            name: application.privacy_consent_file.name,
            url: signedUrl.signedUrl,
            size: application.privacy_consent_file.size,
          };
        }
      } catch (error) {
        console.error('Error creating signed URL for privacy consent:', error);
      }
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              line-height: 1.6;
              color: #3A475B;
              background-color: #f5f5f5;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 720px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
            }
            .header {
              background: linear-gradient(135deg, #28AA48 0%, #34AC48 50%, #AFD235 100%);
              padding: 40px 32px;
              text-align: center;
            }
            .header h1 {
              color: white;
              font-size: 26px;
              font-weight: 800;
              letter-spacing: -0.5px;
              margin-bottom: 8px;
              line-height: 1.3;
            }
            .header p {
              color: rgba(255, 255, 255, 0.95);
              font-size: 15px;
              font-weight: 500;
            }
            .content { padding: 32px; }

            .alert-banner {
              background: linear-gradient(135deg, #FF6B00 0%, #FF8534 100%);
              color: white;
              padding: 20px 24px;
              margin: -32px -32px 32px -32px;
              text-align: center;
              border-bottom: 3px solid #E55A00;
            }
            .alert-banner strong {
              display: block;
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .alert-banner p {
              font-size: 14px;
              opacity: 0.95;
              margin: 0;
            }

            .highlight-box {
              background: linear-gradient(135deg, #28AA48 0%, #34AC48 100%);
              color: white;
              padding: 32px 24px;
              border-radius: 12px;
              text-align: center;
              margin-bottom: 32px;
              box-shadow: 0 4px 12px rgba(40, 170, 72, 0.25);
            }
            .highlight-box .label {
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.9;
              margin-bottom: 8px;
            }
            .highlight-box .amount {
              font-size: 42px;
              font-weight: 800;
              line-height: 1.2;
              margin: 8px 0 16px 0;
              letter-spacing: -1px;
            }
            .highlight-box .sub-info {
              font-size: 15px;
              font-weight: 500;
              opacity: 0.95;
              padding-top: 16px;
              border-top: 1px solid rgba(255, 255, 255, 0.3);
            }

            .section {
              background: #F8FAFB;
              padding: 28px;
              border-radius: 12px;
              margin-bottom: 24px;
              border-left: 4px solid #28AA48;
            }
            .section h2 {
              color: #3A475B;
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 18px;
              padding-bottom: 10px;
              border-bottom: 2px solid #E5E7EB;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-size: 13px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px 24px;
            }
            .info-grid.single-col {
              grid-template-columns: 1fr;
            }
            .info-item {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .info-label {
              font-weight: 600;
              color: #6B7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              color: #3A475B;
              font-size: 16px;
              font-weight: 600;
            }
            .info-value a {
              color: #28AA48;
              text-decoration: none;
              font-weight: 600;
            }
            .info-value a:hover {
              text-decoration: underline;
            }

            .text-block {
              background: white;
              padding: 16px;
              border-radius: 8px;
              color: #6B7280;
              font-size: 14px;
              line-height: 1.7;
              border: 1px solid #E5E7EB;
            }

            .document-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .document-item {
              background: white;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 12px;
              border: 1px solid #E5E7EB;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
            }
            .document-item:last-child {
              margin-bottom: 0;
            }
            .document-info {
              flex: 1;
            }
            .document-name {
              color: #3A475B;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .document-size {
              color: #9CA3AF;
              font-size: 12px;
            }
            .download-btn {
              display: inline-block;
              background: linear-gradient(135deg, #28AA48 0%, #34AC48 100%);
              color: white;
              padding: 10px 20px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              font-size: 13px;
              white-space: nowrap;
              transition: transform 0.2s;
            }
            .download-btn:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(40, 170, 72, 0.3);
            }

            .footer {
              margin-top: 40px;
              padding-top: 24px;
              border-top: 2px solid #E5E7EB;
              text-align: center;
            }
            .footer-info {
              color: #9CA3AF;
              font-size: 13px;
              line-height: 1.8;
            }
            .footer-info strong {
              color: #6B7280;
              font-weight: 600;
            }
            .footer-info .app-id {
              font-family: 'Courier New', monospace;
              background: #F3F4F6;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
            }

            @media only screen and (max-width: 600px) {
              body { padding: 10px; }
              .header { padding: 32px 24px; }
              .header h1 { font-size: 22px; }
              .content { padding: 24px; }
              .highlight-box .amount { font-size: 36px; }
              .info-grid { grid-template-columns: 1fr; gap: 16px; }
              .section { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>New ${equipmentType} Financing Application</h1>
              <p>Green Funding solutions</p>
            </div>

            <div class="content">
              ${installerInfo ? `
              <div class="section" style="margin-bottom: 32px; background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); border-left-color: #0EA5E9;">
                <h2 style="color: #0369A1;">Submitted By Installer</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Installer Name</span>
                    <span class="info-value">${installerInfo.full_name}</span>
                  </div>
                  ${installerInfo.company_name ? `
                  <div class="info-item">
                    <span class="info-label">Company</span>
                    <span class="info-value">${installerInfo.company_name}</span>
                  </div>
                  ` : ''}
                  <div class="info-item">
                    <span class="info-label">Total Applications</span>
                    <span class="info-value">${installerInfo.application_count} submission${installerInfo.application_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              ` : ''}

              ${application.special_pricing_requested ? `
              <div class="alert-banner">
                <strong>Special Pricing Requested</strong>
                <p>This application requires custom pricing review - Priority Follow-up Required</p>
              </div>
              ` : ''}

              <div class="highlight-box">
                <div class="label">Monthly Repayment</div>
                <div class="amount">${formatCurrency(application.calculated_monthly_repayment)}</div>
                <div class="sub-info">
                  <strong>Approval Amount:</strong> ${formatCurrency(application.calculated_approval_amount)} | <strong>Total:</strong> ${formatCurrency(application.calculated_total_repayment)}
                </div>
              </div>

              <div class="section">
                <h2>Financing Details</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Equipment Needed</span>
                    <span class="info-value">${assetNames.join(', ')}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Project Cost</span>
                    <span class="info-value">${formatCurrency(application.project_cost)}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Loan Term</span>
                    <span class="info-value">${application.loan_term_years} years</span>
                  </div>
                  ${application.annual_solar_generation_kwh ? `
                  <div class="info-item">
                    <span class="info-label">Annual Energy Generation</span>
                    <span class="info-value">${application.annual_solar_generation_kwh.toLocaleString()} kWh</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Cost per kWh</span>
                    <span class="info-value">${formatCurrency(application.calculated_cost_per_kwh)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              <div class="section">
                <h2>Contact Details</h2>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Name</span>
                    <span class="info-value">${application.full_name}</span>
                  </div>
                  ${application.company_name ? `
                  <div class="info-item">
                    <span class="info-label">Company</span>
                    <span class="info-value">${application.company_name}</span>
                  </div>
                  ` : ''}
                  <div class="info-item">
                    <span class="info-label">Email</span>
                    <span class="info-value"><a href="mailto:${application.email}">${application.email}</a></span>
                  </div>
                  ${application.phone ? `
                  <div class="info-item">
                    <span class="info-label">Phone</span>
                    <span class="info-value"><a href="tel:${application.phone}">${application.phone}</a></span>
                  </div>
                  ` : ''}
                  ${application.best_time_to_contact ? `
                  <div class="info-item">
                    <span class="info-label">Best Time to Contact</span>
                    <span class="info-value">${application.best_time_to_contact}</span>
                  </div>
                  ` : ''}
                </div>
              </div>

              <div class="section">
                <h2>Business Information</h2>
                <div class="text-block">${application.business_description}</div>
              </div>

              ${application.notes ? `
              <div class="section">
                <h2>Additional Notes</h2>
                <div class="text-block">${application.notes}</div>
              </div>
              ` : ''}

              ${documentLinks.length > 0 ? `
              <div class="section">
                <h2>Uploaded Documents</h2>
                <div class="document-list">
                  ${documentLinks.map((doc: any) => `
                    <div class="document-item">
                      <div class="document-info">
                        <div class="document-name">${doc.name}</div>
                        <div class="document-size">${(doc.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <a href="${doc.url}" class="download-btn">Download</a>
                    </div>
                  `).join('')}
                </div>
              </div>
              ` : ''}

              ${privacyConsentLink ? `
              <div class="section">
                <h2>Privacy Consent</h2>
                <div class="document-item">
                  <div class="document-info">
                    <div class="document-name">${privacyConsentLink.name}</div>
                    <div class="document-size">${(privacyConsentLink.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <a href="${privacyConsentLink.url}" class="download-btn">Download</a>
                </div>
              </div>
              ` : ''}

              <div class="footer">
                <div class="footer-info">
                  <p><strong>Application ID:</strong> <span class="app-id">${application.id}</span></p>
                  <p style="margin-top: 8px;"><strong>Submitted:</strong> ${new Date(application.created_at).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })}</p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const subjectLine = installerInfo
      ? `New ${equipmentType} Application - ${application.full_name} - ${formatCurrency(application.project_cost)} (via ${installerInfo.full_name}${installerInfo.company_name ? ' - ' + installerInfo.company_name : ''})`
      : `New ${equipmentType} Financing Application - ${application.full_name} - ${formatCurrency(application.project_cost)}`;

    const emailResponse = await fetch('https://api.elasticemail.com/v4/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ElasticEmail-ApiKey': elasticEmailApiKey,
      },
      body: JSON.stringify({
        Recipients: [{ Email: 'solutions@greenfunding.com.au' }],
        Content: {
          From: 'noreply@portal.greenfunding.com.au',
          Subject: subjectLine,
          Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: emailHtml }]
        }
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

    let installerEmailId = null;
    if (installerInfo && installerInfo.email) {
      const installerEmailHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                line-height: 1.6;
                color: #3A475B;
                background-color: #f5f5f5;
                padding: 20px;
              }
              .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
              }
              .header {
                background: linear-gradient(135deg, #28AA48 0%, #34AC48 50%, #AFD235 100%);
                padding: 0;
                text-align: center;
                overflow: hidden;
              }
              .header-top {
                padding: 32px 32px 24px 32px;
              }
              .header h1 {
                color: white;
                font-size: 32px;
                font-weight: 800;
                letter-spacing: -0.5px;
                margin-bottom: 8px;
                line-height: 1.2;
              }
              .header p {
                color: rgba(255, 255, 255, 0.95);
                font-size: 16px;
                font-weight: 500;
              }
              .success-banner {
                background: rgba(40, 170, 72, 0.4);
                color: white;
                padding: 32px 24px;
                text-align: center;
                backdrop-filter: blur(10px);
              }
              .success-banner .icon {
                font-size: 56px;
                margin-bottom: 16px;
                display: block;
              }
              .success-banner strong {
                display: block;
                font-size: 24px;
                font-weight: 800;
                margin-bottom: 8px;
                line-height: 1.3;
              }
              .success-banner p {
                font-size: 16px;
                opacity: 0.95;
                margin: 0;
              }
              .content { padding: 32px; }

              .greeting {
                font-size: 18px;
                font-weight: 600;
                color: #3A475B;
                margin-bottom: 16px;
              }

              .message {
                color: #6B7280;
                font-size: 15px;
                line-height: 1.7;
                margin-bottom: 24px;
              }

              .info-box {
                background: #F8FAFB;
                padding: 24px;
                border-radius: 12px;
                margin-bottom: 24px;
                border-left: 4px solid #28AA48;
              }
              .info-box h3 {
                color: #3A475B;
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #E5E7EB;
              }
              .info-row:last-child {
                border-bottom: none;
              }
              .info-label {
                font-weight: 600;
                color: #6B7280;
                font-size: 14px;
              }
              .info-value {
                color: #3A475B;
                font-size: 14px;
                font-weight: 600;
                text-align: right;
              }

              .highlight-amount {
                background: linear-gradient(135deg, #28AA48 0%, #34AC48 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 24px;
              }
              .highlight-amount .label {
                font-size: 13px;
                font-weight: 600;
                text-transform: uppercase;
                opacity: 0.9;
                margin-bottom: 6px;
              }
              .highlight-amount .amount {
                font-size: 32px;
                font-weight: 800;
                line-height: 1.2;
              }

              .security-section {
                background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
                padding: 24px;
                border-radius: 12px;
                margin-bottom: 24px;
                border-left: 4px solid #3B82F6;
              }
              .security-section h3 {
                color: #1E40AF;
                font-size: 16px;
                font-weight: 700;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .security-section .icon {
                font-size: 20px;
              }
              .security-section ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              .security-section li {
                color: #1E40AF;
                font-size: 14px;
                line-height: 1.7;
                padding-left: 24px;
                position: relative;
                margin-bottom: 8px;
              }
              .security-section li:before {
                content: "✓";
                position: absolute;
                left: 0;
                font-weight: bold;
                color: #28AA48;
              }

              .next-steps {
                background: #FEF3C7;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 24px;
                border-left: 4px solid #F59E0B;
              }
              .next-steps h3 {
                color: #92400E;
                font-size: 16px;
                font-weight: 700;
                margin-bottom: 12px;
              }
              .next-steps p {
                color: #78350F;
                font-size: 14px;
                line-height: 1.7;
                margin: 0;
              }

              .footer {
                margin-top: 32px;
                padding-top: 24px;
                border-top: 2px solid #E5E7EB;
                text-align: center;
              }
              .footer-info {
                color: #9CA3AF;
                font-size: 13px;
                line-height: 1.8;
                margin-bottom: 16px;
              }
              .footer-info strong {
                color: #6B7280;
                font-weight: 600;
              }
              .footer-info .app-id {
                font-family: 'Courier New', monospace;
                background: #F3F4F6;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
              }
              .contact-info {
                color: #6B7280;
                font-size: 13px;
                margin-top: 16px;
              }
              .contact-info a {
                color: #28AA48;
                text-decoration: none;
                font-weight: 600;
              }

              @media only screen and (max-width: 600px) {
                body { padding: 10px; }
                .header-top { padding: 24px 20px 20px 20px; }
                .header h1 { font-size: 26px; }
                .success-banner { padding: 28px 20px; }
                .success-banner .icon { font-size: 48px; }
                .success-banner strong { font-size: 20px; }
                .content { padding: 24px; }
                .info-row { flex-direction: column; gap: 4px; }
                .info-value { text-align: left; }
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="header">
                <div class="header-top">
                  <h1>Application Submitted</h1>
                  <p>Green Funding solutions</p>
                </div>
                <div class="success-banner">
                  <div class="icon">✓</div>
                  <strong>Application Successfully Submitted</strong>
                  <p>Your submission for ${application.full_name} has been received</p>
                </div>
              </div>

              <div class="content">

                <div class="greeting" style="font-size: 18px; font-weight: 600; color: #3A475B; margin-bottom: 16px;">
                  Hi ${installerInfo.full_name},
                </div>

                <div class="message" style="color: #3A475B; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
                  Thank you for completing the financing application on behalf of your client. We appreciate your partnership with Green Funding solutions and your commitment to helping businesses access sustainable energy solutions.
                </div>

                <div class="info-box">
                  <h3>Application Summary</h3>
                  <div class="info-row">
                    <span class="info-label">Applicant</span>
                    <span class="info-value">${application.full_name}</span>
                  </div>
                  ${application.company_name ? `
                  <div class="info-row">
                    <span class="info-label">Company</span>
                    <span class="info-value">${application.company_name}</span>
                  </div>
                  ` : ''}
                  <div class="info-row">
                    <span class="info-label">Equipment</span>
                    <span class="info-value">${assetNames.join(', ')}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Project Cost</span>
                    <span class="info-value">${formatCurrency(application.project_cost)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Loan Term</span>
                    <span class="info-value">${application.loan_term_years} years</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Application ID</span>
                    <span class="info-value" style="font-family: 'Courier New', monospace; font-size: 12px;">${application.id.substring(0, 8)}</span>
                  </div>
                </div>

                <div class="highlight-amount">
                  <div class="label">Estimated Monthly Repayment</div>
                  <div class="amount">${formatCurrency(application.calculated_monthly_repayment)}</div>
                </div>

                <div class="security-section" style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #3B82F6;">
                  <h3 style="color: #1E40AF; font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;"><span class="icon" style="font-size: 20px;">🔒</span> Security & Privacy</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="color: #1E40AF; font-size: 14px; line-height: 1.7; padding-left: 24px; position: relative; margin-bottom: 8px;">✓ All uploaded documents are securely stored with enterprise-grade encryption</li>
                    <li style="color: #1E40AF; font-size: 14px; line-height: 1.7; padding-left: 24px; position: relative; margin-bottom: 8px;">✓ Privacy consent forms are handled in strict compliance with Australian Privacy Principles</li>
                    <li style="color: #1E40AF; font-size: 14px; line-height: 1.7; padding-left: 24px; position: relative; margin-bottom: 8px;">✓ Data is only accessible to authorized Green Funding personnel</li>
                    <li style="color: #1E40AF; font-size: 14px; line-height: 1.7; padding-left: 24px; position: relative; margin-bottom: 8px;">✓ Documents are automatically protected with secure access controls</li>
                    <li style="color: #1E40AF; font-size: 14px; line-height: 1.7; padding-left: 24px; position: relative; margin-bottom: 8px;">✓ We maintain full compliance with Australian privacy and data protection regulations</li>
                  </ul>
                </div>

                <div class="next-steps" style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #F59E0B;">
                  <h3 style="color: #92400E; font-size: 16px; font-weight: 700; margin-bottom: 12px;">What Happens Next?</h3>
                  <p style="color: #78350F; font-size: 14px; line-height: 1.7; margin: 0;">
                    Our team will review the application and contact ${application.full_name} directly within 1-2 business days.
                    You'll be kept in the loop throughout the approval process. If we need any additional information,
                    we'll reach out to you or your client directly.
                  </p>
                </div>

                <div class="message" style="color: #3A475B; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
                  Thank you for trusting Green Funding solutions to help your clients finance their sustainable energy projects.
                  Your partnership enables more businesses to make the switch to clean, renewable energy.
                </div>

                <div class="footer">
                  <div class="footer-info">
                    <p><strong>Submitted:</strong> ${new Date(application.created_at).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })}</p>
                    ${installerInfo.company_name ? `<p><strong>Your Company:</strong> ${installerInfo.company_name}</p>` : ''}
                    <p><strong>Total Applications:</strong> ${installerInfo.application_count} submission${installerInfo.application_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div class="contact-info">
                    <p>Questions? Contact us at <a href="mailto:solutions@greenfunding.com.au">solutions@greenfunding.com.au</a></p>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const installerEmailSubject = `Application Submitted for ${application.full_name}`;

      try {
        const installerEmailResponse = await fetch('https://api.elasticemail.com/v4/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ElasticEmail-ApiKey': elasticEmailApiKey,
          },
          body: JSON.stringify({
            Recipients: [{ Email: installerInfo.email }],
            Content: {
              From: 'noreply@portal.greenfunding.com.au',
              Subject: installerEmailSubject,
              Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: installerEmailHtml }]
            }
          }),
        });

        const installerEmailResult = await installerEmailResponse.json();

        if (installerEmailResponse.ok && (!installerEmailResult.Error || installerEmailResult.Error === '')) {
          installerEmailId = installerEmailResult.TransactionID || 'sent';
          console.log('Installer confirmation email sent successfully:', installerEmailId);
        } else {
          console.error('Failed to send installer confirmation email:', installerEmailResult);
        }
      } catch (error) {
        console.error('Error sending installer confirmation email:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.TransactionID || 'sent',
        installerEmailId: installerEmailId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending application email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});