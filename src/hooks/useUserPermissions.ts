import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPoloPermission {
  id: string;
  user_id: string;
  polo: string;
  granted_by: string | null;
  granted_at: string;
  created_at: string;
}

export interface UserWithPermissions {
  id: string;
  name: string;
  email: string;
  role: string;
  polo: string | null;
  permissions: UserPoloPermission[];
}

export function useUserPermissions() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsersWithPermissions = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os usuários (apenas admins podem fazer isso)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin');

      if (usersError) throw usersError;

      // Buscar todas as permissões
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_polo_permissions')
        .select('*');

      if (permissionsError) throw permissionsError;

      // Combinar dados
      const usersWithPermissions = usersData.map(user => ({
        ...user,
        permissions: permissionsData.filter(p => p.user_id === user.id)
      }));

      setUsers(usersWithPermissions);
    } catch (error: any) {
      console.error('Error fetching users with permissions:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const grantPoloPermission = async (userId: string, polo: string) => {
    try {
      const { error } = await supabase
        .from('user_polo_permissions')
        .insert({
          user_id: userId,
          polo: polo as any // Usar any para evitar erro de tipo
        });

      if (error) throw error;

      toast({
        title: 'Permissão concedida',
        description: `Acesso ao polo ${polo} foi concedido com sucesso.`,
      });

      // Recarregar dados
      await fetchUsersWithPermissions();
    } catch (error: any) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Erro ao conceder permissão',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const revokePoloPermission = async (userId: string, polo: string) => {
    try {
      const { error } = await supabase
        .from('user_polo_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('polo', polo as any); // Usar any para evitar erro de tipo

      if (error) throw error;

      toast({
        title: 'Permissão revogada',
        description: `Acesso ao polo ${polo} foi removido com sucesso.`,
      });

      // Recarregar dados
      await fetchUsersWithPermissions();
    } catch (error: any) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Erro ao revogar permissão',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsersWithPermissions();
  }, []);

  return {
    users,
    loading,
    fetchUsersWithPermissions,
    grantPoloPermission,
    revokePoloPermission,
  };
}