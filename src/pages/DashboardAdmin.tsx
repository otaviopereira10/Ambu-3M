import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, LogOut, Settings, Shield, MapPin, FileText, Clock, CheckCircle, XCircle, Search } from 'lucide-react';

const POLOS = ['3M Sumaré', '3M Manaus', '3M Ribeirão Preto', '3M Itapetininga'];

export default function DashboardAdmin() {
  const { profile, signOut } = useAuth();
  const { requests, loading: requestsLoading } = useRequests();
  const { users, loading: usersLoading, grantPoloPermission, revokePoloPermission } = useUserPermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      if (profile.role === 'gestora') {
        navigate('/dashboard-gestora');
      } else {
        navigate('/dashboard-solicitante');
      }
    }
  }, [profile, navigate]);

  const handlePermissionChange = async (userId: string, polo: string, hasPermission: boolean) => {
    if (hasPermission) {
      await revokePoloPermission(userId, polo);
    } else {
      await grantPoloPermission(userId, polo);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

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

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const groupedRequests = POLOS.reduce((acc, polo) => {
    acc[polo] = requests.filter(r => r.users?.polo === polo);
    return acc;
  }, {} as Record<string, any[]>);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Ombro Amigo - Administração
            </h1>
            <p className="text-muted-foreground">Bem-vindo, {profile.name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
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
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{requests.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs principais */}
        <Tabs defaultValue="permissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="permissions">Gerenciar Permissões</TabsTrigger>
            <TabsTrigger value="requests">Todas as Solicitações</TabsTrigger>
            <TabsTrigger value="reports">Relatórios por Polo</TabsTrigger>
          </TabsList>

          {/* Tab de Permissões */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gerenciar Permissões de Usuários
                </CardTitle>
                <CardDescription>
                  Controle quais polos cada usuário pode acessar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar usuário por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Carregando usuários...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Polo Principal</TableHead>
                        {POLOS.map(polo => (
                          <TableHead key={polo} className="text-center">{polo}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'gestora' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <MapPin className="h-3 w-3" />
                              {user.polo || 'Não definido'}
                            </Badge>
                          </TableCell>
                          {POLOS.map(polo => {
                            const hasPermission = user.permissions.some(p => p.polo === polo);
                            return (
                              <TableCell key={polo} className="text-center">
                                <Checkbox
                                  checked={hasPermission}
                                  onCheckedChange={() => handlePermissionChange(user.id, polo, hasPermission)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Solicitações */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Todas as Solicitações
                </CardTitle>
                <CardDescription>
                  Visualize todas as solicitações de todos os polos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Carregando solicitações...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Solicitante</TableHead>
                            <TableHead>Polo</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map(request => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{request.users?.name}</p>
                                  <p className="text-sm text-muted-foreground">{request.users?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <MapPin className="h-3 w-3" />
                                  {request.users?.polo || 'Não definido'}
                                </Badge>
                              </TableCell>
                              <TableCell className="capitalize">{request.type}</TableCell>
                              <TableCell>{formatCurrency(request.amount)}</TableCell>
                              <TableCell>{getStatusBadge(request.status)}</TableCell>
                              <TableCell>{formatDate(request.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Relatórios */}
          <TabsContent value="reports">
            <div className="grid md:grid-cols-2 gap-6">
              {POLOS.map(polo => (
                <Card key={polo}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {polo}
                    </CardTitle>
                    <CardDescription>
                      Resumo das solicitações deste polo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-pending">
                            {groupedRequests[polo]?.filter(r => r.status === 'pending').length || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Pendentes</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-success">
                            {groupedRequests[polo]?.filter(r => r.status === 'approved').length || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Aprovadas</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-destructive">
                            {groupedRequests[polo]?.filter(r => r.status === 'rejected').length || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Recusadas</p>
                        </div>
                      </div>
                      <div className="text-center pt-4 border-t">
                        <p className="text-lg font-semibold">
                          Total: {groupedRequests[polo]?.length || 0} solicitações
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Valor total: {formatCurrency(
                            groupedRequests[polo]?.reduce((sum, req) => sum + req.amount, 0) || 0
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}