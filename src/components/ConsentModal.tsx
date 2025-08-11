import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsentModal({ open, onOpenChange }: ConsentModalProps) {
  const { updatePrivacyConsent } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;

    setLoading(true);
    try {
      await updatePrivacyConsent();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating privacy consent:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary">
            Política de Privacidade - Ombro Amigo
          </DialogTitle>
          <DialogDescription>
            Para continuar, você precisa aceitar nossa política de privacidade conforme a LGPD.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96 w-full rounded-md border p-4">
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">1. Coleta de Dados</h3>
              <p className="text-muted-foreground">
                Coletamos apenas os dados necessários para o funcionamento do programa Ombro Amigo, incluindo:
                nome, email, departamento, telefone e informações relacionadas às solicitações de auxílio.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">2. Uso dos Dados</h3>
              <p className="text-muted-foreground">
                Seus dados são utilizados exclusivamente para:
              </p>
              <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                <li>Processar solicitações de auxílio</li>
                <li>Comunicação sobre o status das solicitações</li>
                <li>Melhoria do programa Ombro Amigo</li>
                <li>Cumprimento de obrigações legais</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">3. Compartilhamento de Dados</h3>
              <p className="text-muted-foreground">
                Seus dados não são compartilhados com terceiros, exceto quando necessário para:
              </p>
              <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                <li>Prestação dos serviços solicitados</li>
                <li>Cumprimento de determinações legais</li>
                <li>Proteção dos direitos da empresa</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">4. Segurança dos Dados</h3>
              <p className="text-muted-foreground">
                Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais
                contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">5. Seus Direitos</h3>
              <p className="text-muted-foreground">
                Conforme a LGPD, você tem direito a:
              </p>
              <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                <li>Confirmação da existência de tratamento</li>
                <li>Acesso aos dados</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Eliminação dos dados pessoais tratados com o consentimento</li>
                <li>Revogação do consentimento</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">6. Retenção de Dados</h3>
              <p className="text-muted-foreground">
                Seus dados serão mantidos pelo tempo necessário para as finalidades para as quais foram coletados,
                respeitando os prazos legais aplicáveis.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">7. Contato</h3>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato através do
                email: privacidade@3m.com.br
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="consent" 
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
          />
          <label
            htmlFor="consent"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Li e aceito a Política de Privacidade
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="bg-gradient-primary"
          >
            {loading ? 'Processando...' : 'Aceitar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}