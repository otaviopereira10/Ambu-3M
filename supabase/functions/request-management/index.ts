import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpdateRequestBody {
  requestId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client using ANON key and end-user auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            // Forward caller's JWT so RLS applies correctly
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    if (req.method === 'POST') {
      const { requestId, status, rejectionReason }: UpdateRequestBody = await req.json();
      console.log('Request data:', { requestId, status, rejectionReason });

      // Update request status
      const { data: approverId, error: approverErr } = await supabaseClient.rpc('current_app_user_id');
      if (approverErr) {
        console.error('Failed to get approver id:', approverErr);
      }

      const updateData: any = {
        status,
        approved_at: new Date().toISOString(),
      };

      if (approverId) {
        updateData.approved_by = approverId;
      }

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      console.log('Updating request with data:', updateData);

      const { data: updatedRequest, error: updateError } = await supabaseClient
        .from('requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update request: ${updateError.message}`);
      }

      console.log('Request updated successfully:', updatedRequest);

      // Email notification intentionally disabled per request

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedRequest,
          message: `Request ${status} successfully` 
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in request-management function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);