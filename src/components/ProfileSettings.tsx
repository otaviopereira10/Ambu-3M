import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, MapPin } from 'lucide-react';

export function ProfileSettings() {
  const { profile, fetchUserProfile } = useAuth();
  const { toast } = useToast();
  const [selectedPolo, setSelectedPolo] = useState<string>(profile?.polo || '');
  const [updating, setUpdating] = useState(false);

  const handleUpdatePolo = async () => {
    if (!profile || !selectedPolo) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ polo: selectedPolo as any })
        .eq('id', profile.id);

      if (error) throw error;

      // Refresh the profile to get updated data
      if (fetchUserProfile) {
        await fetchUserProfile(profile.auth_id);
      }

      toast({
        title: "Perfil atualizado!",
        description: `Polo alterado para: ${selectedPolo}`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!profile) return null;

  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl text-primary flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações do Perfil
        </CardTitle>
        <CardDescription>
          Mantenha suas informações atualizadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Nome:</label>
            <p className="text-sm text-muted-foreground">{profile.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Email:</label>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Polo de Trabalho:
          </label>
          <div className="flex gap-2">
            <Select value={selectedPolo} onValueChange={setSelectedPolo}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione seu polo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3M Sumaré">3M Sumaré</SelectItem>
                <SelectItem value="3M Manaus">3M Manaus</SelectItem>
                <SelectItem value="3M Ribeirão Preto">3M Ribeirão Preto</SelectItem>
                <SelectItem value="3M Itapetininga">3M Itapetininga</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleUpdatePolo}
              disabled={updating || selectedPolo === profile.polo || !selectedPolo}
              size="sm"
            >
              {updating ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
          {profile.polo && (
            <p className="text-xs text-muted-foreground">
              Polo atual: {profile.polo}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}