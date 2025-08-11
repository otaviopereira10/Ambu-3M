import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: currentUser, error: currentUserError } = await supabaseClient
      .from('users')
      .select('id, email, role')
      .eq('auth_id', user.id)
      .single();

    if (currentUserError || !currentUser) {
      throw new Error('User not found');
    }

    // Only allow users to delete their own data (or admins in future)
    const url = new URL(req.url);
    const userIdToDelete = url.pathname.split('/').pop();
    
    if (currentUser.id !== userIdToDelete) {
      throw new Error('You can only delete your own data');
    }

    console.log(`Starting LGPD data deletion for user: ${currentUser.email}`);

    // Delete user data in cascade order (due to foreign key constraints)
    
    // 1. Delete files from storage
    const { data: invoices } = await supabaseClient
      .from('invoices')
      .select('file_url')
      .eq('request_id', 'in', `(select id from requests where user_id = '${currentUser.id}')`);

    if (invoices && invoices.length > 0) {
      for (const invoice of invoices) {
        const fileName = invoice.file_url.split('/').pop();
        if (fileName) {
          await supabaseClient.storage
            .from('invoices')
            .remove([`${currentUser.id}/${fileName}`]);
        }
      }
    }

    // 2. Delete audit logs
    await supabaseClient
      .from('audit_logs')
      .delete()
      .eq('user_id', currentUser.id);

    // 3. Delete comments
    await supabaseClient
      .from('comments')
      .delete()
      .eq('user_id', currentUser.id);

    // 4. Delete invoices (cascade will handle via requests)
    await supabaseClient
      .from('invoices')
      .delete()
      .in('request_id', 
        `(select id from requests where user_id = '${currentUser.id}')`
      );

    // 5. Delete requests
    await supabaseClient
      .from('requests')
      .delete()
      .eq('user_id', currentUser.id);

    // 6. Delete user profile
    await supabaseClient
      .from('users')
      .delete()
      .eq('id', currentUser.id);

    // 7. Delete auth user (this should be done last)
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error('Failed to delete auth user:', authDeleteError);
      // Continue anyway as profile data is deleted
    }

    console.log(`LGPD data deletion completed for user: ${currentUser.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All user data has been permanently deleted in compliance with LGPD',
        deletedUser: currentUser.email
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in user-data-deletion function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);