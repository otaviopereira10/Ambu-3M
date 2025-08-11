import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      // Redirecionar baseado no role do usuário
      switch (profile.role) {
        case 'admin':
          navigate('/dashboard-admin');
          break;
        case 'gestora':
          navigate('/dashboard-gestora');
          break;
        case 'solicitante':
          navigate('/dashboard-solicitante');
          break;
        default:
          navigate('/login');
      }
    } else if (!loading && !profile) {
      navigate('/login');
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Ombro Amigo</h1>
        <p className="text-muted-foreground mb-8">Redirecionando...</p>
      </div>
    </div>
  );
}