'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useFirebase, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { listTenants, registerTenant, updateTenant, Tenant } from '@/app/actions/tenant-actions';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Church,
  Loader2,
  Save,
  Plus,
  Search,
  Building,
  Shield,
  Palette,
  Phone,
  MapPin,
} from 'lucide-react';

export default function ChurchesPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Obter tenant e cargo atual do usuário
  const { data: userTenant, isLoading: loadingUserTenant } = useDoc<any>(
    user ? `userTenants/${user.uid}` : null
  );

  const activeTenantId = userTenant?.tenantId || 'ibm';
  const userRole = userTenant?.role || 'member';

  // O superadmin do sistema é um administrador pertencente ao tenant master 'ibm'
  const isSuperAdmin =
    activeTenantId === 'ibm' &&
    (userRole === 'admin' || userRole === 'pastor_senior');

  // Obter configurações da igreja ativa (tempo real)
  const { data: activeTenantData, isLoading: loadingActiveTenant } = useDoc<any>(
    activeTenantId ? `tenants/${activeTenantId}` : null
  );

  // Estados locais para edição dos dados da igreja ativa
  const [activeName, setActiveName] = useState('');
  const [activeCnpj, setActiveCnpj] = useState('');
  const [activePhone, setActivePhone] = useState('');
  const [activeEmail, setActiveEmail] = useState('');
  const [activeStreet, setActiveStreet] = useState('');
  const [activeCity, setActiveCity] = useState('');
  const [activeState, setActiveState] = useState('');
  const [activeZip, setActiveZip] = useState('');
  const [activeColor, setActiveColor] = useState('#4f46e5');

  // Sincronizar dados carregados da igreja ativa nos inputs
  useEffect(() => {
    if (activeTenantData) {
      setActiveName(activeTenantData.name || '');
      setActiveCnpj(activeTenantData.cnpj || '');
      setActivePhone(activeTenantData.contact?.phone || '');
      setActiveEmail(activeTenantData.contact?.email || '');
      setActiveStreet(activeTenantData.address?.street || '');
      setActiveCity(activeTenantData.address?.city || '');
      setActiveState(activeTenantData.address?.state || '');
      setActiveZip(activeTenantData.address?.zip || '');
      setActiveColor(activeTenantData.settings?.primaryColor || '#4f46e5');
    }
  }, [activeTenantData]);

  // Estados para o painel de Superadmin
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Estados para o formulário de cadastro de nova igreja
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Carregar lista de igrejas se for superadmin
  const fetchTenants = () => {
    if (isSuperAdmin) {
      startTransition(async () => {
        try {
          const list = await listTenants();
          setTenantsList(list);
        } catch (error: any) {
          toast({
            title: 'Erro ao carregar igrejas',
            description: error.message,
            variant: 'destructive',
          });
        }
      });
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [isSuperAdmin]);

  // Salvar alterações da igreja selecionada ou ativa
  const handleSaveActiveTenantSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedTenant ? selectedTenant.id : activeTenantId;

    startTransition(async () => {
      const res = await updateTenant(targetId, {
        name: activeName,
        cnpj: activeCnpj,
        contact: { email: activeEmail, phone: activePhone },
        address: { street: activeStreet, city: activeCity, state: activeState, zip: activeZip },
        settings: {
          primaryColor: activeColor,
          enabledModules: ['teaching', 'volunteering', 'gcs'],
        },
      });

      if (res.success) {
        toast({
          title: 'Configurações salvas',
          description: res.message,
        });
        fetchTenants();
      } else {
        toast({
          title: 'Falha ao salvar',
          description: res.message,
          variant: 'destructive',
        });
      }
    });
  };

  // Cadastrar nova igreja (tenant)
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSlug || !newAdminEmail) {
      toast({
        title: 'Campos obrigatórios ausentes',
        description: 'Por favor, preencha o Nome, Slug e E-mail do Administrador.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const res = await registerTenant({
        name: newName,
        slug: newSlug,
        adminEmail: newAdminEmail,
        phone: newPhone,
      });

      if (res.success) {
        toast({
          title: 'Igreja cadastrada',
          description: res.message,
        });
        setIsCreateOpen(false);
        setNewName('');
        setNewSlug('');
        setNewAdminEmail('');
        setNewPhone('');
        fetchTenants();
      } else {
        toast({
          title: 'Erro no cadastro',
          description: res.message,
          variant: 'destructive',
        });
      }
    });
  };

  // Filtrar lista de igrejas no painel de Superadmin
  const filteredTenants = useMemo(() => {
    return tenantsList.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tenantsList, searchTerm]);

  // Seletor para visualizar detalhes de uma igreja específica no painel Superadmin
  const selectTenantForEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setActiveName(tenant.name || '');
    setActiveCnpj(tenant.cnpj || '');
    setActivePhone(tenant.contact?.phone || '');
    setActiveEmail(tenant.contact?.email || '');
    setActiveStreet(tenant.address?.street || '');
    setActiveCity(tenant.address?.city || '');
    setActiveState(tenant.address?.state || '');
    setActiveZip(tenant.address?.zip || '');
    setActiveColor(tenant.settings?.primaryColor || '#4f46e5');
  };

  const isLoading = loadingUserTenant || loadingActiveTenant;

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se o usuário não for administrador de seu próprio tenant, bloqueia acesso
  if (userRole !== 'admin' && userRole !== 'pastor_senior') {
    return (
      <Card className="w-full max-w-lg mx-auto mt-12">
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle className="mt-4">Acesso Restrito</CardTitle>
          <CardDescription>
            Apenas administradores podem gerenciar as configurações da igreja.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Church className="size-8 text-primary" />
          Gestão de Igreja
        </h1>
        <p className="text-muted-foreground">
          Configure a identidade, os canais de contato e as propriedades do tenant da sua igreja.
        </p>
      </div>

      {isSuperAdmin ? (
        <Tabs defaultValue="registry" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="registry">Igrejas Cadastradas</TabsTrigger>
            <TabsTrigger value="my-church" onClick={() => setSelectedTenant(null)}>
              Minha Igreja ({activeTenantData?.name || 'IBM'})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Painel Geral de Superadmin (Lista de Tenants) */}
          <TabsContent value="registry" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Coluna Esquerda: Listagem de Igrejas */}
              <Card className="md:col-span-1 h-[600px] flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Rede Oiko</CardTitle>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="size-4" />
                          Nova
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Registrar Nova Igreja</DialogTitle>
                          <DialogDescription>
                            Adicione uma nova igreja ao sistema Oiko Studio. Isso criará um novo tenant isolado.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateTenant} className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-name">Nome da Igreja</Label>
                            <Input
                              id="new-name"
                              placeholder="Igreja Videira Central"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-slug">Slug de Identificação (Minúsculo/Sem espaços)</Label>
                            <Input
                              id="new-slug"
                              placeholder="videira-central"
                              value={newSlug}
                              onChange={(e) => setNewSlug(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-email">E-mail do Administrador Inicial</Label>
                            <Input
                              id="new-email"
                              type="email"
                              placeholder="admin@videira.org"
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-phone">Telefone de Contato (Opcional)</Label>
                            <Input
                              id="new-phone"
                              placeholder="(11) 98888-8888"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value)}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                              {isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Cadastrando...
                                </>
                              ) : (
                                'Cadastrar Igreja'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar igreja..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
                  {isPending && tenantsList.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredTenants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma igreja encontrada.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredTenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => selectTenantForEdit(tenant)}
                          className={cn(
                            'w-full text-left p-3 rounded-lg border text-sm transition-all hover:bg-accent flex items-start gap-3',
                            selectedTenant?.id === tenant.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'bg-card'
                          )}
                        >
                          <Building className="size-5 mt-0.5 text-primary shrink-0" />
                          <div className="overflow-hidden">
                            <h4 className="font-semibold truncate">{tenant.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">
                              slug: {tenant.slug}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {tenant.contact?.email || 'Sem e-mail'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Coluna Direita: Detalhes e Edição da Igreja Selecionada */}
              <div className="md:col-span-2">
                {selectedTenant ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Church className="size-5 text-primary" />
                        Configurações: {selectedTenant.name}
                      </CardTitle>
                      <CardDescription>
                        Edite as propriedades cadastrais e de layout do tenant desta igreja.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderSettingsForm(
                        handleSaveActiveTenantSettings,
                        isPending,
                        activeName,
                        setActiveName,
                        activeCnpj,
                        setActiveCnpj,
                        activePhone,
                        setActivePhone,
                        activeEmail,
                        setActiveEmail,
                        activeStreet,
                        setActiveStreet,
                        activeCity,
                        setActiveCity,
                        activeState,
                        setActiveState,
                        activeZip,
                        setActiveZip,
                        activeColor,
                        setActiveColor
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-card text-center p-6 border-dashed">
                    <Church className="size-12 text-muted-foreground animate-pulse mb-3" />
                    <h3 className="font-bold text-lg">Nenhuma Igreja Selecionada</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                      Selecione uma igreja na lista à esquerda para editar seus dados ou clique em "Nova" para criar uma.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Minha Igreja (Admin Local da IBM) */}
          <TabsContent value="my-church" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Minha Igreja</CardTitle>
                <CardDescription>
                  Configure os dados institucionais e canais de comunicação para {activeTenantData?.name}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSettingsForm(
                  handleSaveActiveTenantSettings,
                  isPending,
                  activeName,
                  setActiveName,
                  activeCnpj,
                  setActiveCnpj,
                  activePhone,
                  setActivePhone,
                  activeEmail,
                  setActiveEmail,
                  activeStreet,
                  setActiveStreet,
                  activeCity,
                  setActiveCity,
                  activeState,
                  setActiveState,
                  activeZip,
                  setActiveZip,
                  activeColor,
                  setActiveColor
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* Painel para administradores locais normais (Sem privilégio superadmin global) */
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Igreja</CardTitle>
            <CardDescription>
              Gerencie a identidade e dados de contato de sua igreja local.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderSettingsForm(
              handleSaveActiveTenantSettings,
              isPending,
              activeName,
              setActiveName,
              activeCnpj,
              setActiveCnpj,
              activePhone,
              setActivePhone,
              activeEmail,
              setActiveEmail,
              activeStreet,
              setActiveStreet,
              activeCity,
              setActiveCity,
              activeState,
              setActiveState,
              activeZip,
              setActiveZip,
              activeColor,
              setActiveColor
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Formulário reutilizável de configurações de igreja
function renderSettingsForm(
  onSubmit: (e: React.FormEvent) => void,
  isPending: boolean,
  name: string,
  setName: (v: string) => void,
  cnpj: string,
  setCnpj: (v: string) => void,
  phone: string,
  setPhone: (v: string) => void,
  email: string,
  setEmail: (v: string) => void,
  street: string,
  setStreet: (v: string) => void,
  city: string,
  setCity: (v: string) => void,
  state: string,
  setState: (v: string) => void,
  zip: string,
  setZip: (v: string) => void,
  color: string,
  setColor: (v: string) => void
) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Dados Gerais */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Building className="size-5 text-primary" />
          Dados Institucionais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Igreja</Label>
            <Input
              id="name"
              placeholder="Igreja Batista Memorial"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contatos */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Phone className="size-5 text-primary" />
          Canais de Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Principal</Label>
            <Input
              id="email"
              type="email"
              placeholder="secretaria@igreja.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 3333-3333"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Endereço */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          Localização
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="street">Endereço Completo</Label>
            <Input
              id="street"
              placeholder="Avenida Paulista, 1000 - Bela Vista"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">CEP</Label>
            <Input
              id="zip"
              placeholder="01310-100"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              placeholder="São Paulo"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado (UF)</Label>
            <Input
              id="state"
              placeholder="SP"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Branding / Estilo */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          Aparência e Identidade
        </h3>
        <div className="flex items-center gap-4">
          <div className="space-y-2 shrink-0">
            <Label htmlFor="color">Cor Principal da Marca</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                className="w-12 h-10 p-0 border cursor-pointer rounded"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="text-sm font-mono uppercase">{color}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Selecione a cor primária que será associada à identidade e aos destaques visuais do painel da sua igreja.
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" className="gap-2" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
