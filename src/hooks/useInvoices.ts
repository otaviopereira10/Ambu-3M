import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Invoice {
  id: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}

export function useInvoices() {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadInvoices = async (requestId: string, files: File[]) => {
    if (!profile) throw new Error('User not authenticated');

    setUploading(true);
    const uploadedInvoices: Invoice[] = [];

    try {
      for (const file of files) {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('invoices')
          .getPublicUrl(filePath);

        // Save invoice record
        const { data: invoice, error: saveError } = await supabase
          .from('invoices')
          .insert({
            request_id: requestId,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();

        if (saveError) {
          throw saveError;
        }

        uploadedInvoices.push(invoice);
      }

      return uploadedInvoices;
    } catch (error) {
      console.error('Error uploading invoices:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const getInvoicesForRequest = async (requestId: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('request_id', requestId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  };

  const deleteInvoice = async (invoiceId: string) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;
  };

  return {
    uploadInvoices,
    getInvoicesForRequest,
    deleteInvoice,
    uploading,
  };
}