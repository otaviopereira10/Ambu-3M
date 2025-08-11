import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { File, Eye, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RequestAttachmentsProps {
  requestId: string;
  attachments?: string[];
}

interface Invoice {
  id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
}

export function RequestAttachments({ requestId, attachments = [] }: RequestAttachmentsProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('request_id', requestId)
          .order('uploaded_at', { ascending: false });

        if (error) {
          console.error('Erro ao buscar invoices:', error);
        } else {
          setInvoices(data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar anexos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [requestId]);

  const handleViewFile = async (fileUrl: string, fileName: string) => {
    try {
      if (fileUrl.startsWith('http')) {
        // URL completa
        window.open(fileUrl, '_blank');
      } else {
        // Caminho relativo, construir URL do storage
        const { data } = supabase.storage
          .from('invoices')
          .getPublicUrl(fileUrl);
        
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      let blob: Blob;

      if (!fileUrl.startsWith('http')) {
        // Caminho relativo: baixar direto do bucket
        const { data, error } = await supabase.storage
          .from('invoices')
          .download(fileUrl);
        if (error) throw error;
        blob = data as Blob;
      } else {
        // URL pública completa
        const response = await fetch(fileUrl);
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Arquivo baixado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro", 
        description: "Erro ao baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleViewAttachment = async (attachment: string) => {
    try {
      const { data } = supabase.storage
        .from('request-attachments')
        .getPublicUrl(attachment);
      
      window.open(data.publicUrl, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar anexo:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir o arquivo",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAttachment = async (attachment: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('request-attachments')
        .download(attachment);
      
      if (error) {
        throw error;
      }
      
      const fileName = attachment.split('/').pop() || 'anexo';
      const blob = new Blob([data], { type: data.type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Arquivo baixado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      toast({
        title: "Erro", 
        description: "Erro ao baixar o arquivo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium mb-2">Anexos da Solicitação:</p>
        <p className="text-sm text-muted-foreground">Carregando anexos...</p>
      </div>
    );
  }

  const hasAttachments = (attachments && attachments.length > 0) || invoices.length > 0;

  if (!hasAttachments) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium mb-2">Anexos da Solicitação:</p>
        <p className="text-sm text-muted-foreground">Nenhum anexo encontrado para esta solicitação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2">Anexos da Solicitação:</p>
      
      {/* Anexos do campo attachments */}
      {attachments && attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Anexos principais:</p>
          {attachments.map((attachment: string, index: number) => {
            const fileName = attachment.split('/').pop() || `Anexo ${index + 1}`;
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">Anexo da solicitação</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewAttachment(attachment)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadAttachment(attachment)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Anexos da tabela invoices */}
      {invoices.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Faturas/Comprovantes enviados:</p>
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{invoice.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.file_size && `Tamanho: ${(invoice.file_size / 1024 / 1024).toFixed(2)} MB`}
                    {invoice.mime_type && ` • Tipo: ${invoice.mime_type}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewFile(invoice.file_url, invoice.file_name)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadFile(invoice.file_url, invoice.file_name)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Baixar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}