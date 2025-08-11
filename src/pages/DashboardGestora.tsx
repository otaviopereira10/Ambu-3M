import { useEffect, useState } from 'react';

import { InvoiceManager } from '@/components/InvoiceManager';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { useInvoices } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Clock, CheckCircle, XCircle, LogOut, Eye, ThumbsUp, ThumbsDown, Download, Paperclip, MapPin, File, Settings } from 'lucide-react';

export default function DashboardGestora() {
  const { profile, signOut } = useAuth();
  const { requests, loading, updateRequestStatus } = useRequests();
  const { getInvoicesForRequest } = useInvoices();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [allowedPolos, setAllowedPolos] = useState<string[]>([]);
  
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        let polos: string[] = [];
        if (profile.polo) polos.push(profile.polo);
        if (profile.role === 'gestora') {
          const { data } = await supabase
            .from('user_polo_permissions')
            .select('polo')
            .eq('user_id', profile.id);
          if (data && data.length > 0) {
            polos = [...polos, ...data.map((p: any) => p.polo)];
          }
        }
        const unique = Array.from(new Set(polos));
        setAllowedPolos(unique);
      } catch (e) {
        console.error('Erro ao carregar polos permitidos:', e);
      }
    };
    load();
  }, [profile]);
  

  useEffect(() => {
    if (profile && profile.role !== 'gestora') {
      navigate('/dashboard-solicitante');
    }
  }, [profile, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-pending-light text-pending"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-success-light text-success"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-destructive-light text-destructive"><XCircle className="w-3 h-3 mr-1" />Recusado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(true);
    try {
      await updateRequestStatus(requestId, 'approved');
      toast({
        title: 'Solicitação aprovada!',
        description: 'Status atualizado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da recusa.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      await updateRequestStatus(requestId, 'rejected', reason);
      toast({
        title: 'Solicitação recusada',
        description: 'Status atualizado com sucesso.',
      });
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error: any) {
      toast({
        title: 'Erro ao recusar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const loadInvoices = async (requestId: string) => {
    try {
      const requestInvoices = await getInvoicesForRequest(requestId);
      setInvoices(requestInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    }
  };

  const handleViewRequest = async (request: any) => {
    setSelectedRequest(request);
    await loadInvoices(request.id);
  };

  const viewInvoice = (invoice: any) => {
    const url: string | undefined = invoice?.file_url;
    if (!url) return;
    try {
      if (url.startsWith('http')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const { data } = supabase.storage.from('invoices').getPublicUrl(url);
        window.open(data.publicUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('Erro ao visualizar arquivo:', e);
      toast({ title: 'Erro', description: 'Não foi possível abrir o arquivo.', variant: 'destructive' });
    }
  };

  const downloadInvoice = async (invoice: any) => {
    const url: string | undefined = invoice?.file_url;
    if (!url) return;
    try {
      let blob: Blob;
      if (url.startsWith('http')) {
        const res = await fetch(url);
        blob = await res.blob();
      } else {
        const { data, error } = await supabase.storage.from('invoices').download(url);
        if (error) throw error;
        blob = data as Blob;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = invoice.file_name || 'nota-fiscal.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('Erro ao baixar arquivo:', e);
      toast({ title: 'Erro', description: 'Não foi possível baixar o arquivo.', variant: 'destructive' });
    }
  };

  const getInvoiceByFileName = (fileName: string) => invoices.find((f: any) => f.file_name === fileName);
  const viewByFileName = (fileName: string) => {
    const f = getInvoiceByFileName(fileName);
    if (!f) {
      toast({ title: 'Arquivo não encontrado', description: 'Recarregue os anexos e tente novamente.', variant: 'destructive' });
      return;
    }
    viewInvoice(f);
  };
  const downloadByFileName = async (fileName: string) => {
    const f = getInvoiceByFileName(fileName);
    if (!f) {
      toast({ title: 'Arquivo não encontrado', description: 'Recarregue os anexos e tente novamente.', variant: 'destructive' });
      return;
    }
    await downloadInvoice(f);
  };

  // As permissões já são filtradas no hook useRequests, então não precisamos filtrar novamente
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Ombro Amigo - Gestão</h1>
            <p className="text-muted-foreground">Bem-vinda, {profile.name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-pending" />
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
                  <p className="text-sm text-muted-foreground">Recusadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard do Polo do Gestor */}
        <div className="space-y-6">
          {!profile?.polo ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configure seu polo</h3>
                <p className="text-muted-foreground mb-4">
                  Para visualizar as solicitações, primeiro configure qual polo você gerencia.
                </p>
                <Button onClick={() => navigate('/profile')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurar Polo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Solicitações Pendentes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl text-primary flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Pendentes
                      <Badge variant="outline" className="ml-2">
                        <MapPin className="h-3 w-3 mr-1" />
                         {allowedPolos.length > 0 ? allowedPolos.join(', ') : '—'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Solicitações aguardando análise e aprovação
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Carregando...</p>
                      </div>
                    ) : pendingRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Nenhuma solicitação pendente nos seus polos
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-start">
                          <div>
                               <h3 className="font-semibold text-foreground">Solicitação</h3>
                               <p className="text-sm text-muted-foreground">
                                 {request.users?.name} • {request.polo} • {formatDate(request.created_at)}
                               </p>
                             </div>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          
                          
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold text-primary">{formatCurrency(request.amount)}</span>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewRequest(request)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id)}
                                disabled={processing}
                                className="bg-gradient-success"
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                Aprovar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

                {/* Histórico */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl text-primary flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Histórico
                      <Badge variant="outline" className="ml-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        {allowedPolos.length > 0 ? allowedPolos.join(', ') : '—'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Solicitações já processadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {processedRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Nenhuma solicitação processada nos seus polos
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {processedRequests.map((request) => (
                          <div key={request.id} className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50" 
                               onClick={() => handleViewRequest(request)}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-foreground">Solicitação</h3>
                                <p className="text-sm text-muted-foreground">
                                  {request.users?.name} • {request.polo} • {formatDate(request.created_at)}
                                </p>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-primary">{formatCurrency(request.amount)}</span>
                              <span className="text-xs text-muted-foreground">#{request.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setInvoices([]);
          setRejectionReason('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Analise os dados e tome uma decisão sobre a solicitação
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Solicitante:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.users?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">CPF:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.cpf || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Polo:</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.polo || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Valor:</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedRequest.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Data:</p>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>
              

              {/* Dependentes */}
              {selectedRequest.dependents && selectedRequest.dependents.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Dependentes:</p>
                  <div className="space-y-2">
                    {selectedRequest.dependents.map((dependent: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded-md">
                        <p className="text-sm font-medium">{dependent.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{dependent.relationship}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Notas Fiscais */}
              <div>
                <p className="text-sm font-medium mb-2">Notas Fiscais:</p>
                {selectedRequest.invoices && selectedRequest.invoices.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRequest.invoices.map((invoice: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gradient-subtle">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Beneficiário</p>
                            <p className="text-sm font-medium">{invoice.beneficiary}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Valor</p>
                            <p className="text-sm font-bold text-success">
                              R$ {invoice.value.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        {invoice.sessions > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground">Sessões</p>
                            <p className="text-sm">{invoice.sessions} sessões</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                          <p className="text-sm bg-white p-2 rounded border">
                            {invoice.description}
                          </p>
                        </div>
                        
                        {invoice.fileName && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                            <Paperclip className="h-3 w-3" />
                            {invoice.fileName}
                              <div className="flex items-center gap-2 ml-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!getInvoiceByFileName(invoice.fileName)}
                                  onClick={() => viewByFileName(invoice.fileName)}
                                >
                                  Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!getInvoiceByFileName(invoice.fileName)}
                                  onClick={() => downloadByFileName(invoice.fileName)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Baixar
                                </Button>
                              </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma nota fiscal enviada</p>
                )}
              </div>

              {/* Arquivos Antigos (Invoices do sistema anterior) */}
              {invoices.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Arquivos Enviados:</p>
                  <div className="space-y-2">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="border rounded-md p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium">{invoice.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(invoice.file_size / 1024 / 1024).toFixed(1)} MB • {new Date(invoice.uploaded_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewInvoice(invoice)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadInvoice(invoice)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Motivo da recusa (opcional):</p>
                <Textarea
                  placeholder="Informe o motivo caso vá recusar a solicitação..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleReject(selectedRequest.id, rejectionReason)}
              disabled={processing}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Recusar
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              disabled={processing}
              className="bg-gradient-success"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}