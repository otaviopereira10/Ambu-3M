import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useInvoices } from '@/hooks/useInvoices';
import { useToast } from '@/hooks/use-toast';
import { FileText, Edit2, Trash2, Save, X, DollarSign, User, Calendar } from 'lucide-react';

interface InvoiceCardProps {
  invoice?: {
    id?: string;
    value: number;
    beneficiary: string;
    sessions?: number;
    description: string;
    file?: File;
    fileName?: string;
  };
  onSave: (invoice: any) => void;
  onDelete?: (id: string) => void;
  isEditing?: boolean;
  onEditToggle?: () => void;
}

export function InvoiceCard({ 
  invoice, 
  onSave, 
  onDelete, 
  isEditing = false, 
  onEditToggle 
}: InvoiceCardProps) {
  const [editData, setEditData] = useState(invoice || {
    value: 0,
    beneficiary: '',
    sessions: 0,
    description: '',
    file: null,
    fileName: ''
  });
  const { toast } = useToast();

  const handleSave = () => {
    if (!editData.value || !editData.beneficiary || !editData.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha valor, beneficiário e descrição.',
        variant: 'destructive',
      });
      return;
    }

    onSave(editData);
    onEditToggle?.();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditData(prev => ({ 
        ...prev, 
        file, 
        fileName: file.name 
      }));
    }
  };

  if (isEditing) {
    return (
      <Card className="border-primary/20 bg-gradient-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            {invoice?.id ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Valor da Nota Fiscal *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={editData.value || ''}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  value: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="beneficiary">Beneficiário *</Label>
              <Input
                id="beneficiary"
                placeholder="Nome do beneficiário"
                value={editData.beneficiary}
                onChange={(e) => setEditData(prev => ({ 
                  ...prev, 
                  beneficiary: e.target.value 
                }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sessions">Quantidade de Sessões (se aplicável)</Label>
            <Input
              id="sessions"
              type="number"
              placeholder="0"
              value={editData.sessions || ''}
              onChange={(e) => setEditData(prev => ({ 
                ...prev, 
                sessions: parseInt(e.target.value) || 0 
              }))}
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição Detalhada *</Label>
            <Textarea
              id="description"
              placeholder="Descreva os serviços prestados, período, etc..."
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              className="min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="file">Arquivo da Nota Fiscal</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
            />
            {editData.fileName && (
              <p className="text-sm text-muted-foreground mt-1">
                📄 {editData.fileName}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} size="sm" className="bg-gradient-success">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button onClick={onEditToggle} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-primary">Nota Fiscal</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button onClick={onEditToggle} variant="ghost" size="sm">
              <Edit2 className="h-4 w-4" />
            </Button>
            {onDelete && invoice?.id && (
              <Button onClick={() => onDelete(invoice.id!)} variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="font-semibold text-success">
                {formatCurrency(invoice?.value || 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Beneficiário</p>
              <p className="font-medium">{invoice?.beneficiary || 'Não informado'}</p>
            </div>
          </div>
        </div>

        {invoice?.sessions && invoice.sessions > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Sessões</p>
              <Badge variant="secondary">{invoice.sessions} sessões</Badge>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-1">Descrição</p>
          <p className="text-sm bg-muted p-2 rounded">
            {invoice?.description || 'Nenhuma descrição fornecida'}
          </p>
        </div>

        {invoice?.fileName && (
          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">{invoice.fileName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}