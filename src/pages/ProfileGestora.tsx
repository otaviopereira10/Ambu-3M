import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSettings } from '@/components/ProfileSettings';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';

export default function ProfileGestora() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.role !== 'gestora') {
      navigate('/dashboard-solicitante');
    }
  }, [profile, navigate]);

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard-gestora')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Configurações do Perfil</h1>
              <p className="text-muted-foreground">{profile.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Profile Settings */}
        <div className="max-w-2xl mx-auto">
          <ProfileSettings />
        </div>
      </div>
    </div>
  );
}