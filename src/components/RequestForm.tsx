import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { InvoiceManager } from '@/components/InvoiceManager';
import { Plus, Trash2, Calculator, Heart, Upload, File, X } from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';

// Schema para dependente
const dependentSchema = z.object({
  name: z.string().min(2, 'Nome do dependente deve ter pelo menos 2 caracteres'),
  relationship: z.string().min(1, 'Selecione o parentesco'),
});

// Schema para o formulário principal
const formSchema = z.object({
  cpf: z.string().min(11, 'CPF obrigatório').regex(/^\d{11}$/, 'CPF deve ter 11 dígitos numéricos'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  polo: z.string().min(1, 'Selecione o polo'),
  salary: z.number().min(0, 'Salário deve ser um valor válido').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Dependent {
  name: string;
  relationship: string;
}

const BASE_SALARY = 2018.36;
const SALARY_PERCENTAGE = 0.9;

export function RequestForm() {
  const { profile } = useAuth();
  const { createRequest, loading } = useRequests();
  const { uploadInvoices } = useInvoices();
  const { toast } = useToast();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpf: '',
      amount: 0,
      polo: '',
      salary: 0,
    },
  });

  const watchSalary = form.watch('salary');

  // Cálculo automático baseado no salário
  const calculateReimbursement = (salary: number) => {
    if (salary <= 0) return 0;
    
    const maxReimbursable = salary * SALARY_PERCENTAGE;
    
    // Se o salário é menor ou igual ao piso, reembolso 100%
    if (maxReimbursable <= BASE_SALARY) {
      return BASE_SALARY;
    }
    
    // Caso contrário, reembolsa 90% do salário
    return maxReimbursable;
  };

  const suggestedAmount = calculateReimbursement(watchSalary || 0);

  const addDependent = () => {
    setDependents([...dependents, { name: '', relationship: '' }]);
  };

  const removeDependent = (index: number) => {
    setDependents(dependents.filter((_, i) => i !== index));
  };

  const updateDependent = (index: number, field: keyof Dependent, value: string) => {
    const updated = [...dependents];
    updated[index] = { ...updated[index], [field]: value };
    setDependents(updated);
  };


  const useSuggestedAmount = () => {
    form.setValue('amount', suggestedAmount);
    toast({
      title: "Valor atualizado",
      description: `Valor sugerido de R$ ${suggestedAmount.toFixed(2)} aplicado.`,
    });
  };

  const uploadFiles = async (files: File[]) => {
    if (!profile?.id || files.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of files) {
        console.log('Uploading file:', file.name, 'Size:', file.size);
        
        // Verificar tamanho do arquivo (máx 50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`Arquivo ${file.name} excede o limite de 50MB`);
        }
        
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${profile.id}/${timestamp}-${file.name}`;
        
        console.log('Uploading to path:', fileName);
        
        const { data, error } = await supabase.storage
          .from('request-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (error) {
          console.error('Upload error for file', file.name, ':', error);
          throw new Error(`Erro ao fazer upload do arquivo ${file.name}: ${error.message}`);
        }
        
        if (data?.path) {
          console.log('Upload successful, path:', data.path);
          uploadedUrls.push(data.path);
        } else {
          throw new Error(`Upload não retornou um caminho válido para ${file.name}`);
        }
      }
      
      console.log('All uploads completed. Paths:', uploadedUrls);
      return uploadedUrls;
    } catch (error) {
      console.error('Upload files error:', error);
      throw error;
    }
  };

  async function onSubmit(values: FormData) {
    if (!profile?.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // 1) Cria a solicitação com CPF obrigatório
      const created = await createRequest({
        type: 'outros',
        amount: values.amount,
        polo: values.polo,
        cpf: values.cpf,
        invoices: invoices,
        dependents: dependents,
      } as any);

      // 2) Faz upload dos arquivos das notas (se houver) e vincula à solicitação
      const filesToUpload = (invoices || [])
        .filter((inv: any) => !!inv.file)
        .map((inv: any) => inv.file as File);

      if (filesToUpload.length > 0 && created?.id) {
        await uploadInvoices(created.id, filesToUpload);
      }

      // Reset form
      form.reset();
      setInvoices([]);
      setDependents([]);
      setShowCalculator(false);
      
      toast({
        title: "Sucesso!",
        description: "Solicitação criada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <Heart className="h-6 w-6" />
          Nova Solicitação
        </CardTitle>
        <CardDescription>
          Preencha os dados para solicitar auxílio financeiro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Calculadora de Reembolso */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Calculadora de Reembolso</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCalculator(!showCalculator)}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {showCalculator ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
              
              {showCalculator && (
                <div className="bg-gradient-subtle p-4 rounded-lg border border-primary/20 space-y-4">
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário Bruto Mensal</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Digite seu salário"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {suggestedAmount > 0 && (
                    <div className="bg-success-light p-3 rounded-md border border-success/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-success">💰 Valor Sugerido de Reembolso</p>
                          <p className="text-lg font-bold text-success">R$ {suggestedAmount.toFixed(2)}</p>
                          <p className="text-xs text-success/80">
                            {suggestedAmount === BASE_SALARY 
                              ? `Piso mínimo: 100% até R$ ${BASE_SALARY.toFixed(2)}`
                              : `90% do salário: R$ ${(watchSalary * SALARY_PERCENTAGE).toFixed(2)}`
                            }
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={useSuggestedAmount}
                          className="bg-success hover:bg-success/90"
                        >
                          Usar Valor
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Polo */}
            <FormField
              control={form.control}
              name="polo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Polo de Trabalho</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu polo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="3M Sumaré">3M Sumaré</SelectItem>
                      <SelectItem value="3M Itapetininga">3M Itapetininga</SelectItem>
                      <SelectItem value="3M Manaus">3M Manaus</SelectItem>
                      <SelectItem value="3M Ribeirão Preto">3M Ribeirão Preto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CPF */}
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF do Solicitante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Somente números (11 dígitos)"
                      inputMode="numeric"
                      maxLength={11}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Valor */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Solicitado (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas Fiscais */}
            <InvoiceManager
              onChange={setInvoices}
              initialInvoices={invoices}
            />


            <Button type="submit" disabled={loading || uploading} className="w-full">
              {uploading ? 'Fazendo upload...' : loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}