import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generatePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "list") {
      const { data: installerUsers, error: installerError } = await supabase
        .from("installer_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (installerError) throw installerError;

      const { data: adminUsersData, error: adminError } = await supabase
        .from("admin_users")
        .select("id, email, first_name, last_name, company, phone, created_at, needs_password_reset, is_super_admin")
        .order("created_at", { ascending: false });

      if (adminError) throw adminError;

      const adminUsers = (adminUsersData || []).map(user => ({
        id: user.id,
        full_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Admin',
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.company || 'Angle Finance',
        phone: user.phone,
        email: user.email || '',
        needs_password_reset: user.needs_password_reset || false,
        is_super_admin: user.is_super_admin || false,
        created_at: user.created_at,
        application_count: 0,
        quote_count: 0,
        user_type: 'admin',
      }));

      const installerUsersWithType = (installerUsers || []).map(user => ({
        ...user,
        user_type: 'installer',
      }));

      return new Response(
        JSON.stringify({ users: [...adminUsers, ...installerUsersWithType] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-admin") {
      const { firstName, lastName, email, companyName, phone, requestingAdminId } = await req.json();

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: requestingAdmin } = await supabase
        .from("admin_users")
        .select("is_super_admin")
        .eq("id", requestingAdminId)
        .maybeSingle();

      if (!requestingAdmin?.is_super_admin) {
        return new Response(
          JSON.stringify({ error: "Only super admins can create admin accounts" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newPassword = generatePassword();

      const encoder = new TextEncoder();
      const data = encoder.encode(newPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: newAdmin, error: createError } = await supabase
        .from("admin_users")
        .insert({
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          company: companyName || null,
          phone: phone || null,
          password_hash: passwordHash,
          needs_password_reset: true,
          is_super_admin: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      return new Response(
        JSON.stringify({ success: true, newPassword, admin: newAdmin }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const { userId, fullName, companyName, email, userType, firstName, lastName, phone, allowedCalculators } = await req.json();

      if (!userId || !email) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userType === 'admin') {
        const updateData: any = { email, updated_at: new Date().toISOString() };
        if (firstName !== undefined) updateData.first_name = firstName;
        if (lastName !== undefined) updateData.last_name = lastName;
        if (companyName !== undefined) updateData.company = companyName;
        if (phone !== undefined) updateData.phone = phone;

        const { error: updateError } = await supabase
          .from("admin_users")
          .update(updateData)
          .eq("id", userId);

        if (updateError) throw updateError;
      } else {
        if (!fullName || !companyName) {
          return new Response(
            JSON.stringify({ error: "Missing required fields for installer" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const installerUpdateData: any = { full_name: fullName, company_name: companyName, email };
        if (allowedCalculators !== undefined) installerUpdateData.allowed_calculators = allowedCalculators;

        const { error: updateError } = await supabase
          .from("installer_users")
          .update(installerUpdateData)
          .eq("id", userId);

        if (updateError) throw updateError;

        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, { email });
        if (authUpdateError) throw authUpdateError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { userId, userType, requestingAdminId } = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing user ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userType === 'admin') {
        const { data: requestingAdmin } = await supabase
          .from("admin_users")
          .select("is_super_admin")
          .eq("id", requestingAdminId)
          .maybeSingle();

        if (!requestingAdmin?.is_super_admin) {
          return new Response(
            JSON.stringify({ error: "Only super admins can delete admin accounts" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deleteError } = await supabase
          .from("admin_users")
          .delete()
          .eq("id", userId);

        if (deleteError) throw deleteError;
      } else {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset-password") {
      const { userId, userType } = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing user ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userType === 'admin') {
        const newPassword = generatePassword();

        const encoder = new TextEncoder();
        const data = encoder.encode(newPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const { error: updateError } = await supabase
          .from("admin_users")
          .update({ password_hash: passwordHash, needs_password_reset: true, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, newPassword }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const elasticEmailApiKey = Deno.env.get("ELASTIC_EMAIL_API_KEY");
        if (!elasticEmailApiKey) throw new Error("ELASTIC_EMAIL_API_KEY not configured");

        const { data: userData, error: fetchError } = await supabase
          .from("installer_users")
          .select("email, full_name, company_name")
          .eq("id", userId)
          .single();

        if (fetchError || !userData) throw new Error("Installer user not found");

        const newPassword = generatePassword();

        const { error: authError } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
        if (authError) throw authError;

        const { error: updateError } = await supabase
          .from("installer_users")
          .update({ needs_password_reset: true })
          .eq("id", userId);

        if (updateError) throw updateError;

        const emailHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>body{font-family:sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.credentials{background:#f9f9f9;padding:15px;border-radius:5px;margin:20px 0}.password{font-size:18px;font-weight:bold;letter-spacing:1px;color:#28AA48}.important{color:#d32f2f;font-weight:bold}</style></head><body><div class="container"><h2>Password Reset</h2><p>Hi ${userData.full_name},</p><p>An administrator has reset your password for the Green Funding Installer Portal.</p><div class="credentials"><p><strong>Your new temporary password is:</strong></p><p class="password">${newPassword}</p></div><p class="important">You will be required to create a new password when you first log in.</p><p>Visit <a href="https://portal.greenfunding.com.au/installer-login">portal.greenfunding.com.au/installer-login</a> to log in.</p><p>Best regards,<br>Green Funding Support</p></div></body></html>`;

        const plainTextEmail = `Hi ${userData.full_name},\n\nAn administrator has reset your password.\nYour new temporary password is: ${newPassword}\n\nYou will be required to create a new password when you first log in.\nGo to: https://portal.greenfunding.com.au/installer-login\n\nGreen Funding Support`;

        const emailResponse = await fetch("https://api.elasticemail.com/v4/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-ElasticEmail-ApiKey": elasticEmailApiKey },
          body: JSON.stringify({
            Recipients: [{ Email: userData.email }],
            Content: {
              From: "noreply@portal.greenfunding.com.au",
              ReplyTo: "support@greenfundingcalculator.com",
              Subject: "Green Funding Portal - Your Password Has Been Reset",
              Body: [
                { ContentType: "HTML", Charset: "utf-8", Content: emailHtml },
                { ContentType: "PlainText", Charset: "utf-8", Content: plainTextEmail }
              ]
            }
          }),
        });

        const emailResult = await emailResponse.json();
        if (!emailResponse.ok || (emailResult.Error && emailResult.Error !== "")) {
          throw new Error("Failed to send reset email");
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-users function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
