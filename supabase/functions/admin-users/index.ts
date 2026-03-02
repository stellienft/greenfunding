import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
        .select("id, email, first_name, last_name, company, phone, created_at, needs_password_reset")
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
        created_at: user.created_at,
        application_count: 0,
        quote_count: 0,
        user_type: 'admin',
      }));

      const installerUsersWithType = (installerUsers || []).map(user => ({
        ...user,
        user_type: 'installer',
      }));

      const allUsers = [...adminUsers, ...installerUsersWithType];

      return new Response(
        JSON.stringify({ users: allUsers }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      const { userId, fullName, companyName, email, userType, firstName, lastName, phone } = await req.json();

      if (!userId || !email) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userType === 'admin') {
        const updateData: any = {
          email: email,
          updated_at: new Date().toISOString(),
        };

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

        const { error: updateError } = await supabase
          .from("installer_users")
          .update({
            full_name: fullName,
            company_name: companyName,
            email: email,
          })
          .eq("id", userId);

        if (updateError) throw updateError;

        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
          userId,
          { email: email }
        );

        if (authUpdateError) throw authUpdateError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { userId } = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing user ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

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
        function generatePassword() {
          const length = 12;
          const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
          let password = '';
          for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
          }
          return password;
        }

        const newPassword = generatePassword();

        const encoder = new TextEncoder();
        const data = encoder.encode(newPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const { error: updateError } = await supabase
          .from("admin_users")
          .update({
            password_hash: passwordHash,
            needs_password_reset: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, newPassword }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const { error } = await supabase
          .from("installer_users")
          .update({ needs_password_reset: true })
          .eq("id", userId);

        if (error) throw error;

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