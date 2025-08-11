import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailNotificationRequest {
  requestId: string;
  action: 'approved' | 'rejected';
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { requestId, action, rejectionReason }: EmailNotificationRequest = await req.json();

    // Get request details with user info
    const { data: requestData, error: requestError } = await supabaseClient
      .from('requests')
      .select(`
        *,
        users!requests_user_id_fkey (
          name,
          email
        )
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      throw new Error(`Failed to fetch request: ${requestError?.message}`);
    }

    const user = requestData.users;
    const subject = action === 'approved' 
      ? '✅ Solicitação Ombro Amigo Aprovada'
      : '❌ Solicitação Ombro Amigo Recusada';

    const emailBody = action === 'approved' 
      ? `
        <h2>Sua solicitação foi aprovada!</h2>
        <p>Olá ${user.name},</p>
        <p>Sua solicitação de auxílio para <strong>${requestData.type}</strong> foi aprovada.</p>
        <p><strong>Valor:</strong> R$ ${requestData.amount.toFixed(2)}</p>
        <p><strong>Descrição:</strong> ${requestData.description}</p>
        <p>Em breve você receberá mais informações sobre os próximos passos.</p>
        <p>Atenciosamente,<br/>Equipe Ombro Amigo</p>
      `
      : `
        <h2>Solicitação não aprovada</h2>
        <p>Olá ${user.name},</p>
        <p>Sua solicitação de auxílio para <strong>${requestData.type}</strong> não foi aprovada.</p>
        <p><strong>Valor:</strong> R$ ${requestData.amount.toFixed(2)}</p>
        <p><strong>Motivo:</strong> ${rejectionReason || 'Não informado'}</p>
        <p>Se tiver dúvidas, entre em contato com o RH.</p>
        <p>Atenciosamente,<br/>Equipe Ombro Amigo</p>
      `;

    // Log the email action
    console.log(`Email notification sent for request ${requestId}: ${action}`);
    console.log(`Recipient: ${user.email}`);
    console.log(`Subject: ${subject}`);

    // In a real implementation, you would integrate with an email service here
    // For now, we'll just log the email details
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification logged',
        details: {
          recipient: user.email,
          subject,
          action
        }
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
    console.error('Error in send-notification-email function:', error);
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