import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestForm } from '@/components/RequestForm';
import { ProfileSettings } from '@/components/ProfileSettings';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, XCircle, LogOut, File } from 'lucide-react';

export default function DashboardSolicitante() {
  const { profile, signOut } = useAuth();
  const { requests, loading } = useRequests();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.role !== 'solicitante') {
      navigate('/dashboard-gestora');
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

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Ombro Amigo</h1>
            <p className="text-muted-foreground">
              Bem-vindo, {profile.name} • Polo: {profile.polo || 'Não informado'}
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulário de Nova Solicitação */}
          <div className="space-y-6">
            <RequestForm />
            <ProfileSettings />
          </div>

          {/* Lista de Solicitações */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-primary">Minhas Solicitações</CardTitle>
                <CardDescription>
                  Acompanhe o status das suas solicitações de auxílio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Carregando solicitações...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
                    <p className="text-sm text-muted-foreground">Crie sua primeira solicitação ao lado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-foreground capitalize">{request.type}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.created_at)} • Polo: {profile.polo || 'Não informado'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Solicitante: {request.users?.name || profile.name}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <p className="text-sm text-foreground">{request.description}</p>
                        
                        {/* Mostrar dependentes se existirem */}
                        {request.dependents && request.dependents.length > 0 && (
                          <div className="mt-2 p-2 bg-primary/5 rounded-md">
                            <p className="text-xs font-semibold text-primary mb-1">Dependentes:</p>
                            <div className="space-y-1">
                              {request.dependents.map((dependent, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground">
                                  • {dependent.name} ({dependent.relationship})
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mostrar notas fiscais se existirem */}
                        {request.invoices && request.invoices.length > 0 && (
                          <div className="mt-2 p-2 bg-primary/5 rounded-md">
                            <p className="text-xs font-semibold text-primary mb-2">Notas Fiscais:</p>
                            <div className="space-y-2">
                              {request.invoices.map((invoice: any, idx: number) => (
                                <div key={idx} className="p-2 bg-white rounded border border-primary/20">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-medium text-primary">
                                      {invoice.beneficiary}
                                    </span>
                                    <span className="text-xs font-bold text-success">
                                      R$ {invoice.value.toFixed(2)}
                                    </span>
                                  </div>
                                  {invoice.sessions > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {invoice.sessions} sessões
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {invoice.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mostrar anexos se existirem */}
                        {request.attachments && request.attachments.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-md">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Anexos enviados:</p>
                            <div className="space-y-1">
                              {request.attachments.map((attachment, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <File className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs text-blue-600">
                                    Anexo {idx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-semibold text-primary">{formatCurrency(request.amount)}</span>
                          <span className="text-xs text-muted-foreground">#{request.id.slice(0, 8)}</span>
                        </div>

                        {/* Notificações de Status */}
                        {request.status === 'approved' && (
                          <div className="bg-success-light p-3 rounded-md border border-success/20">
                            <p className="text-sm font-medium text-success">✅ Solicitação Aprovada!</p>
                            <p className="text-sm text-success">Você será contatado em breve com mais informações.</p>
                          </div>
                        )}
                        
                        {request.rejection_reason && (
                          <div className="bg-destructive-light p-3 rounded-md border border-destructive/20">
                            <p className="text-sm font-medium text-destructive">❌ Solicitação Recusada</p>
                            <p className="text-sm text-destructive"><strong>Motivo:</strong> {request.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}