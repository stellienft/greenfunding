import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // GET /quote-upload/verify?token=xxx — verify token and return quote details
    if (req.method === 'GET' && action === 'verify') {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: quote, error } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, recipient_name, recipient_company, recipient_email, project_cost, upload_token_expires_at, accepted_at')
        .eq('upload_token', token)
        .maybeSingle();

      if (error || !quote) {
        return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (quote.upload_token_expires_at && new Date(quote.upload_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'This link has expired. Please contact Green Funding.' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: uploads } = await supabase
        .from('quote_document_uploads')
        .select('id, document_type, file_name, uploaded_at')
        .eq('quote_id', quote.id);

      return new Response(JSON.stringify({ quote, uploads: uploads || [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /quote-upload/submit — upload a document
    if (req.method === 'POST' && action === 'submit') {
      const formData = await req.formData();
      const token = formData.get('token') as string;
      const documentType = formData.get('documentType') as string;
      const file = formData.get('file') as File;

      if (!token || !documentType || !file) {
        return new Response(JSON.stringify({ error: 'token, documentType and file are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: quote, error: quoteError } = await supabase
        .from('sent_quotes')
        .select('id, quote_number, upload_token_expires_at')
        .eq('upload_token', token)
        .maybeSingle();

      if (quoteError || !quote) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (quote.upload_token_expires_at && new Date(quote.upload_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Link expired' }), {
          status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${documentType}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `client-uploads/${quote.id}/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

      if (uploadError) {
        return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: insertError } = await supabase
        .from('quote_document_uploads')
        .insert({
          quote_id: quote.id,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });

      if (insertError) {
        return new Response(JSON.stringify({ error: 'Failed to record upload' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Notify admin via email
      const elasticEmailApiKey = Deno.env.get('ELASTIC_EMAIL_API_KEY');
      if (elasticEmailApiKey) {
        const quoteNum = '#' + String(quote.quote_number).padStart(6, '0');
        const { data: signedUrl } = await supabase.storage
          .from('application-documents')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7);

        EdgeRuntime.waitUntil((async () => {
          try {
            const html = `<html><body style="font-family:Arial;padding:24px;background:#f5f5f5;">
              <table width="600" style="background:white;border-radius:8px;margin:0 auto;overflow:hidden;">
                <tr><td style="background:linear-gradient(135deg,#1a2e3b,#2D3A4A);padding:24px 32px;">
                  <p style="color:white;font-size:18px;font-weight:700;margin:0;">New Document Uploaded</p>
                  <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px;">Quote ${quoteNum}</p>
                </td></tr>
                <tr><td style="padding:28px 32px;">
                  <p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>Document Type:</strong> ${documentType.replace(/_/g, ' ')}</p>
                  <p style="font-size:14px;color:#374151;margin:0 0 8px;"><strong>File Name:</strong> ${file.name}</p>
                  <p style="font-size:14px;color:#374151;margin:0 0 24px;"><strong>Quote:</strong> ${quoteNum}</p>
                  ${signedUrl?.signedUrl ? `<a href="${signedUrl.signedUrl}" style="background:#28AA48;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Download File</a>` : ''}
                </td></tr>
              </table>
            </body></html>`;

            await fetch('https://api.elasticemail.com/v4/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-ElasticEmail-ApiKey': elasticEmailApiKey,
              },
              body: JSON.stringify({
                Recipients: [{ Email: 'solutions@greenfunding.com.au' }],
                Content: {
                  From: 'noreply@portal.greenfunding.com.au',
                  ReplyTo: 'solutions@greenfunding.com.au',
                  Subject: `New Document Upload — ${quoteNum} — ${documentType.replace(/_/g, ' ')}`,
                  Body: [{ ContentType: 'HTML', Charset: 'utf-8', Content: html }],
                },
              }),
            });
          } catch (e) {
            console.error('Failed to send admin notification:', e);
          }
        })());
      }

      return new Response(JSON.stringify({ success: true, filePath }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('quote-upload error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
