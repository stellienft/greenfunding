import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

async function getResendApiKey(): Promise<string | null> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await supabase.from('site_settings').select('resend_api_key').maybeSingle();
  return (data?.resend_api_key as string | undefined)?.trim() || Deno.env.get('RESEND_API_KEY') || null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, fullName, companyName, temporaryPassword } = await req.json();

    if (!email || !fullName || !companyName || !temporaryPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = await getResendApiKey();

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
              max-width: 600px;
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
            .header img {
              max-width: 220px;
              height: auto;
              margin: 0 auto 20px;
              display: block;
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
              color: rgba(255,255,255,0.9);
              font-size: 15px;
              font-weight: 500;
            }
            .content { padding: 32px; }
            
            .welcome-message {
              font-size: 16px;
              color: #3A475B;
              line-height: 1.7;
              margin-bottom: 32px;
            }
            
            .credentials-box {
              background: #F8FAFB;
              border: 2px solid #28AA48;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
            }
            
            .credentials-box h2 {
              color: #28AA48;
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 16px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .credential-item {
              margin-bottom: 16px;
            }
            
            .credential-label {
              font-weight: 600;
              color: #6B7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              display: block;
              margin-bottom: 4px;
            }
            
            .credential-value {
              color: #3A475B;
              font-size: 18px;
              font-weight: 700;
              font-family: 'Courier New', monospace;
              background: white;
              padding: 12px 16px;
              border-radius: 6px;
              border: 1px solid #E5E7EB;
            }
            
            .warning-box {
              background: rgba(251, 146, 60, 0.1);
              border: 1px solid rgba(251, 146, 60, 0.3);
              padding: 20px;
              border-radius: 8px;
              margin: 24px 0;
            }

            .warning-box strong {
              display: block;
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 8px;
              color: #EA580C;
            }

            .warning-box p {
              font-size: 14px;
              color: #9A3412;
              margin: 0;
            }
            
            .steps-list {
              background: #F8FAFB;
              padding: 24px;
              border-radius: 12px;
              margin: 24px 0;
            }
            
            .steps-list h3 {
              color: #3A475B;
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 16px;
            }
            
            .steps-list ol {
              padding-left: 20px;
            }
            
            .steps-list li {
              margin-bottom: 12px;
              font-size: 14px;
              line-height: 1.6;
            }
            
            .footer {
              margin-top: 32px;
              padding-top: 24px;
              border-top: 2px solid #E5E7EB;
              text-align: center;
              color: #9CA3AF;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <img src="https://portal.greenfunding.com.au/green-funding-invertedlogo.svg" alt="Green Funding" />
              <h1>Green Funding Installer Portal</h1>
              <p>Welcome to Your Account</p>
            </div>

            <div class="content">
              <div class="welcome-message">
                <p>Hi ${fullName},</p>
                <p style="margin-top: 16px;">Welcome to the Green Funding Installer Portal! Your account has been created for ${companyName}.</p>
              </div>

              <div class="credentials-box">
                <h2>Your Login Credentials</h2>
                <div class="credential-item">
                  <span class="credential-label">Email Address</span>
                  <div class="credential-value">${email}</div>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Temporary Password</span>
                  <div class="credential-value">${temporaryPassword}</div>
                </div>
              </div>

              <div class="warning-box">
                <strong>Important: Password Reset Required</strong>
                <p>For security reasons, you will be required to create a new password when you first log in.</p>
              </div>

              <div class="steps-list">
                <h3>Getting Started</h3>
                <ol>
                  <li>Visit <a href="https://portal.greenfunding.com.au/installer-login" style="color: #28AA48; text-decoration: underline;">portal.greenfunding.com.au/installer-login</a></li>
                  <li>Log in using your email and the temporary password above</li>
                  <li>You'll be prompted to create a new secure password</li>
                  <li>Once your password is set, you can start using the portal</li>
                </ol>
              </div>

              <div class="footer">
                <p><strong>Green Funding</strong></p>
                <p style="margin-top: 8px;">If you have any questions, please contact your administrator.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainTextEmail = `
Hi ${fullName},

Welcome to the Green Funding Installer Portal! Your account has been created for ${companyName}.

YOUR LOGIN CREDENTIALS
=======================

Email Address: ${email}
Temporary Password: ${temporaryPassword}

IMPORTANT: Password Reset Required
For security reasons, you will be required to create a new password when you first log in.

GETTING STARTED
===============

1. Visit https://portal.greenfunding.com.au/installer-login
2. Log in using your email and the temporary password above
3. You'll be prompted to create a new secure password
4. Once your password is set, you can start using the portal

Green Funding
If you have any questions, please contact your administrator.
    `.trim();

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@portal.greenfunding.com.au",
        reply_to: "support@greenfundingcalculator.com",
        to: [email],
        subject: "Welcome to Green Funding Installer Portal - Your Login Credentials",
        html: emailHtml,
        text: plainTextEmail,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id || 'sent' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});