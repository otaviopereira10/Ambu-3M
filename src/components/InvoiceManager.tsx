import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceCard } from './InvoiceCard';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText } from 'lucide-react';

interface Invoice {
  id: string;
  value: number;
  beneficiary: string;
  sessions?: number;
  description: string;
  fileName?: string;
  file?: File;
}

interface InvoiceManagerProps {
  requestId?: string;
  initialInvoices?: Invoice[];
  onChange: (invoices: Invoice[]) => void;
  readOnly?: boolean;
}

export function InvoiceManager({ 
  requestId, 
  initialInvoices = [], 
  onChange, 
  readOnly = false 
}: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const handleSaveInvoice = (invoiceData: any) => {
    if (editingId) {
      // Editando nota fiscal existente
      const updatedInvoices = invoices.map(inv => 
        inv.id === editingId ? { ...inv, ...invoiceData } : inv
      );
      setInvoices(updatedInvoices);
      onChange(updatedInvoices);
      setEditingId(null);
      toast({
        title: 'Nota fiscal atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    } else {
      // Criando nova nota fiscal
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        ...invoiceData,
      };
      const updatedInvoices = [...invoices, newInvoice];
      setInvoices(updatedInvoices);
      onChange(updatedInvoices);
      setShowNewForm(false);
      toast({
        title: 'Nota fiscal adicionada',
        description: 'Nova nota fiscal foi criada com sucesso.',
      });
    }
  };

  const handleDeleteInvoice = (id: string) => {
    const updatedInvoices = invoices.filter(inv => inv.id !== id);
    setInvoices(updatedInvoices);
    onChange(updatedInvoices);
    toast({
      title: 'Nota fiscal removida',
      description: 'A nota fiscal foi excluída com sucesso.',
    });
  };

  const totalValue = invoices.reduce((sum, inv) => sum + inv.value, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notas Fiscais
              {invoices.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({invoices.length} nota{invoices.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardTitle>
            {!readOnly && (
              <Button
                onClick={() => setShowNewForm(true)}
                size="sm"
                className="bg-gradient-primary"
                disabled={showNewForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nota Fiscal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 && (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-primary">
                  Valor Total das Notas Fiscais:
                </span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalValue)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Formulário para nova nota fiscal */}
            {showNewForm && (
              <InvoiceCard
                isEditing={true}
                onSave={handleSaveInvoice}
                onEditToggle={() => setShowNewForm(false)}
              />
            )}

            {/* Lista de notas fiscais */}
            {invoices.length === 0 && !showNewForm ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma nota fiscal adicionada</p>
                {!readOnly && (
                  <p className="text-sm text-muted-foreground">
                    Clique em "Adicionar Nota" para começar
                  </p>
                )}
              </div>
            ) : (
              invoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  isEditing={editingId === invoice.id}
                  onSave={handleSaveInvoice}
                  onDelete={readOnly ? undefined : handleDeleteInvoice}
                  onEditToggle={
                    readOnly
                      ? undefined
                      : () => setEditingId(editingId === invoice.id ? null : invoice.id)
                  }
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}