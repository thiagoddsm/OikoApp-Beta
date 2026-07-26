'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/tenant-context';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, deleteDoc } from 'firebase/firestore';
import { KpiDefinition, KpiCategory, KpiDataSourceType } from '@/domain/kpi';
import { SYSTEM_KPI_TEMPLATES } from '@/constants/kpi-templates';
import { Plus, Trash2, CheckCircle2, Circle, Settings2 } from 'lucide-react';

interface KpiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiDefinitions: KpiDefinition[];
  courses: any[];
}

export function KpiSettingsDialog({
  open,
  onOpenChange,
  kpiDefinitions,
  courses,
}: KpiSettingsDialogProps) {
  const { tenantId } = useTenant();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // Form para novo KPI customizado ou edição
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [newKpiName, setNewKpiName] = useState('');
  const [newKpiCategory, setNewKpiCategory] = useState<KpiCategory>('custom');
  const [newKpiType, setNewKpiType] = useState<KpiDataSourceType>('course_completion');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (kpi: KpiDefinition) => {
    setEditingKpiId(kpi.id);
    setNewKpiName(kpi.name);
    setNewKpiCategory(kpi.category || 'custom');
    setNewKpiType(kpi.dataSource?.type || 'course_completion');
    setSelectedCourseId(kpi.dataSource?.courseId || '');
    setActiveTab('add');
  };

  const handleDeleteKpi = async (kpiId: string) => {
    if (!firestore || !tenantId) return;
    try {
      await deleteDoc(doc(firestore, `kpi_definitions/${tenantId}/items`, kpiId));
      toast({
        title: 'KPI Removido',
        description: 'O indicador foi removido das configurações.',
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: 'Não foi possível excluir o KPI.' });
    }
  };

  const handleToggleActive = async (kpi: KpiDefinition) => {
    if (!firestore || !tenantId) return;

    const kpiRef = doc(firestore, `kpi_definitions/${tenantId}/items`, kpi.id);
    const updatedData: Partial<KpiDefinition> = {
      ...kpi,
      active: !kpi.active,
      updatedAt: new Date(),
    };

    await setDocumentNonBlocking(kpiRef, updatedData, { merge: true });

    toast({
      title: kpi.active ? 'KPI Desativado' : 'KPI Ativado',
      description: `O indicador "${kpi.name}" foi ${kpi.active ? 'ocultado' : 'ativado'}.`,
    });
  };

  const handleAddFromTemplate = async (templateId: string) => {
    if (!firestore || !tenantId) return;
    const template = SYSTEM_KPI_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setIsSaving(true);
    const kpiRef = doc(firestore, `kpi_definitions/${tenantId}/items`, template.id);

    const newKpi: KpiDefinition = {
      id: template.id,
      tenantId,
      templateId: template.id,
      name: template.name,
      description: template.description,
      iconName: template.iconName,
      category: template.category,
      dataSource: template.defaultDataSource,
      active: true,
      createdAt: new Date(),
    };

    await setDocumentNonBlocking(kpiRef, newKpi, { merge: true });

    toast({
      title: 'KPI Adicionado!',
      description: `O indicador "${template.name}" foi incluído nas suas metas.`,
    });

    setIsSaving(false);
  };

  const handleCreateCustomKpi = async () => {
    if (!newKpiName.trim()) {
      toast({ variant: 'destructive', title: 'Nome Obrigatório', description: 'Insira um nome para o KPI.' });
      return;
    }

    if (newKpiType === 'course_completion' && !selectedCourseId) {
      toast({ variant: 'destructive', title: 'Curso Obrigatório', description: 'Selecione o curso vinculado.' });
      return;
    }

    if (!firestore || !tenantId) return;
    setIsSaving(true);

    const targetId = editingKpiId || `kpi_custom_${Date.now()}`;
    const kpiRef = doc(firestore, `kpi_definitions/${tenantId}/items`, targetId);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    const newKpi: KpiDefinition = {
      id: targetId,
      tenantId,
      templateId: null,
      name: newKpiName,
      iconName: 'GraduationCap',
      category: newKpiCategory,
      dataSource: {
        type: newKpiType,
        courseId: selectedCourseId,
        courseName: selectedCourse?.name || selectedCourse?.title || '',
      },
      active: true,
      updatedAt: new Date(),
    };

    await setDocumentNonBlocking(kpiRef, newKpi, { merge: true });

    toast({
      title: editingKpiId ? 'KPI Atualizado!' : 'KPI Criado com Sucesso!',
      description: `O indicador "${newKpiName}" foi salvo e configurado.`,
    });

    setEditingKpiId(null);
    setNewKpiName('');
    setSelectedCourseId('');
    setIsSaving(false);
    setActiveTab('list');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            Configuração de Indicadores (KPIs)
          </DialogTitle>
          <DialogDescription>
            Gerencie quais KPIs aparecem no painel de metas da sua instituição e vincule aos seus cursos ou dados.
          </DialogDescription>
        </DialogHeader>

        {/* Abas */}
        <div className="flex border-b border-border space-x-4">
          <button
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('list')}
          >
            KPIs Ativos ({kpiDefinitions.length})
          </button>
          <button
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'add'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('add')}
          >
            + Adicionar Novo KPI
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="space-y-3 py-2">
            {kpiDefinitions.map(kpi => (
              <div
                key={kpi.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleActive(kpi)}
                    className="text-primary hover:opacity-80"
                  >
                    {kpi.active ? (
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </button>
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      {kpi.name}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {kpi.category}
                      </Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {kpi.description || `Fonte: ${kpi.dataSource?.type === 'course_completion' ? `Curso (${kpi.dataSource.courseName || 'Linkado'})` : kpi.dataSource?.type}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(kpi)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteKpi(kpi.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Adicionar a partir de Template Padrão */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Templates Padrão do Sistema</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SYSTEM_KPI_TEMPLATES.map(tmpl => {
                  const alreadyExists = kpiDefinitions.some(k => k.id === tmpl.id);
                  return (
                    <div
                      key={tmpl.id}
                      className="p-3 border rounded-lg flex items-center justify-between bg-muted/30"
                    >
                      <div className="truncate mr-2">
                        <p className="text-xs font-semibold truncate">{tmpl.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{tmpl.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyExists ? 'ghost' : 'outline'}
                        disabled={alreadyExists || isSaving}
                        onClick={() => handleAddFromTemplate(tmpl.id)}
                        className="text-xs shrink-0"
                      >
                        {alreadyExists ? 'Ativo' : 'Adicionar'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-border" />

            {/* Criar KPI Customizado */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                Criar KPI Personalizado (Self-Service SaaS)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Indicador</Label>
                  <Input
                    placeholder="Ex: Concluíram Escola de Liderança"
                    value={newKpiName}
                    onChange={e => setNewKpiName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={newKpiCategory}
                    onValueChange={(val: any) => setNewKpiCategory(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ensino">Ensino / Cursos</SelectItem>
                      <SelectItem value="gc">Gestão de Células</SelectItem>
                      <SelectItem value="culto">Frequência de Culto</SelectItem>
                      <SelectItem value="crescimento">Crescimento / Frutos</SelectItem>
                      <SelectItem value="lideranca">Liderança</SelectItem>
                      <SelectItem value="custom">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Origem dos Dados</Label>
                  <Select
                    value={newKpiType}
                    onValueChange={(val: any) => setNewKpiType(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course_completion">Aprovação em Curso Específico</SelectItem>
                      <SelectItem value="collection_count">Contagem de Células</SelectItem>
                      <SelectItem value="field_sum">Soma de Conversões</SelectItem>
                      <SelectItem value="user_role">Formação de Líderes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newKpiType === 'course_completion' && (
                  <div className="space-y-2">
                    <Label>Vincular ao Curso</Label>
                    <Select
                      value={selectedCourseId}
                      onValueChange={val => setSelectedCourseId(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um curso da sua igreja" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name || course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreateCustomKpi}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Salvar KPI Personalizado
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
