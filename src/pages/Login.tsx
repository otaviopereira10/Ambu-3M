import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConsentModal } from '@/components/ConsentModal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'solicitante' | 'gestora' | 'admin'>('solicitante');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  
  const { signIn, signUp, user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      if (!profile.privacy_consent) {
        setShowConsent(true);
      } else {
        // Redirect based on role
        if (profile.role === 'admin') {
          navigate('/dashboard-admin');
        } else if (profile.role === 'gestora') {
          navigate('/dashboard-gestora');
        } else {
          navigate('/dashboard-solicitante');
        }
      }
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name, role);
        if (error) throw error;
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary text-center">
            Ombro Amigo
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? 'Criar nova conta' : 'Entre com suas credenciais'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <Input
                  type="text"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Select value={role} onValueChange={(value: 'solicitante' | 'gestora' | 'admin') => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solicitante">Solicitante</SelectItem>
                    <SelectItem value="gestora">Gestora</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              {loading ? 'Processando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Já tem conta? Fazer login' : 'Criar nova conta'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConsentModal 
        open={showConsent} 
        onOpenChange={(open) => {
          if (!open && profile?.privacy_consent) {
            // Redirect after consent
            if (profile.role === 'admin') {
              navigate('/dashboard-admin');
            } else if (profile.role === 'gestora') {
              navigate('/dashboard-gestora');
            } else {
              navigate('/dashboard-solicitante');
            }
          }
          setShowConsent(open);
        }} 
      />
    </div>
  );
}