import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Request {
  id: string;
  user_id: string;
  type: 'psicológico' | 'médico' | 'odontológico' | 'fisioterapia' | 'outros';
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  polo?: string;
  attachments?: string[];
  invoices?: Array<{
    id: string;
    value: number;
    beneficiary: string;
    sessions?: number;
    description: string;
    fileName?: string;
  }>;
  dependents?: Array<{
    name: string;
    relationship: string;
  }>;
  users?: {
    name: string;
    email: string;
    department?: string;
    polo?: string;
  };
}

export function useRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      let query = supabase.from('requests').select(`
        *,
        users!requests_user_id_fkey (
          name,
          email,
          department,
          polo
        )
      `);

      // If user is solicitante, only show their requests
      if (profile.role === 'solicitante') {
        query = query.eq('user_id', profile.id);
      } else if (profile.role === 'gestora') {
        // For gestoras, show requests from polos they have permission to access
        const { data: permissions } = await supabase
          .from('user_polo_permissions')
          .select('polo')
          .eq('user_id', profile.id);
        
        // Gestoras podem ver o próprio polo + permissões adicionais
        let allowedPolos: string[] = [];
        
        // Adicionar o polo próprio da gestora
        if (profile.polo) {
          allowedPolos.push(profile.polo);
        }
        
        // Adicionar polos com permissões especiais
        if (permissions && permissions.length > 0) {
          const additionalPolos = permissions.map(p => p.polo);
          allowedPolos = [...allowedPolos, ...additionalPolos];
        }
        
        // Remover duplicatas
        allowedPolos = [...new Set(allowedPolos)];
        
        if (allowedPolos.length > 0) {
          // Filtrar apenas pelas solicitações cujo campo 'polo' está nas permissões da gestora
          query = query.in('polo', allowedPolos);
        } else {
          // Se não tem polo próprio nem permissões, retornar vazio
          setRequests([]);
          setError(null);
          return;
        }
      }
      // Admin users can see all requests (no filter needed)

      // Order by creation date, newest first
      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Transform the data to match our Request interface
      const transformedData = (data || []).map(request => ({
        ...request,
        dependents: Array.isArray(request.dependents) 
          ? request.dependents as Array<{ name: string; relationship: string }>
          : []
      }));
      setRequests(transformedData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: {
    type: Request['type'];
    description?: string;
    amount: number;
    polo: string;
    cpf: string;
    dependents?: Array<{ name: string; relationship: string }>;
    attachments?: string[];
    invoices?: Array<{
      id: string;
      value: number;
      beneficiary: string;
      sessions?: number;
      description: string;
      fileName?: string;
    }>;
  }) => {
    if (!profile) throw new Error('User not authenticated');

    const cleanedInvoices = (requestData.invoices || []).map(inv => ({
      id: inv.id,
      value: inv.value,
      beneficiary: inv.beneficiary,
      sessions: inv.sessions,
      description: inv.description,
      fileName: inv.fileName,
    }));

    const payload: any = {
      user_id: profile.id,
      type: requestData.type,
      amount: requestData.amount,
      polo: requestData.polo,
      cpf: requestData.cpf,
      description: requestData.description ?? null,
      dependents: requestData.dependents ?? [],
      attachments: requestData.attachments ?? [],
      invoices: cleanedInvoices,
    };

    const { data, error } = await supabase
      .from('requests')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Refresh requests list
    await fetchRequests();
    return data;
  };

  const updateRequestStatus = async (
    requestId: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string
  ) => {
    try {
      console.log('Updating request status:', { requestId, status, rejectionReason });
      
      // Get the current session to include the authorization token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('request-management', {
        body: {
          requestId,
          status,
          rejectionReason,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao atualizar status da solicitação');
      }

      console.log('Request status updated successfully:', data);
      
      // Refresh requests list
      await fetchRequests();
    } catch (error: any) {
      console.error('UpdateRequestStatus error:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (profile) {
      fetchRequests();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('requests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return {
    requests,
    loading,
    error,
    createRequest,
    updateRequestStatus,
    refetch: fetchRequests,
  };
}