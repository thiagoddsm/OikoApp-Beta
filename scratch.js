const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Thiago Moura', 'Downloads', 'oiko(studio)', 'src', 'app', 'dashboard', 'notifications', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 7. Usar GroupDetailSheet no lugar dos originais ANTES de injetar o helper
const originalSheetRegex = /<Sheet open=\{\!\!groupDetail\}[\s\S]*?<\/Sheet>/g;
content = content.replace(originalSheetRegex, '<GroupDetailSheet groupDetail={groupDetail} isLoadingDetail={isLoadingDetail} setGroupDetail={setGroupDetail} resolveUser={resolveUser} />');

// 1. Extrair resolveUser para o topo e usar em WhatsappResponses e WhatsappSender
if (!content.includes('function getResolvedUserName')) {
    const helperFunction = `
// Helper: resolver ID para nome usando users/contacts do sistema
export function getResolvedUserName(rawId: string, users: any[], waContacts: any[]): string {
    const idDigits = String(rawId || '').replace(/\\D/g, '');
    
    // 1. Tenta match no sistema
    const matchedUser = users?.find((u: any) => {
        const uPhone = String(u.phone || '').replace(/\\D/g, '');
        const uLid = String(u.lid || '').split('@')[0];
        const uJid = String(u.jid || '').split('@')[0];

        if (uPhone && uPhone.length >= 8) {
            const uPhoneNoCountry = uPhone.startsWith('55') ? uPhone.substring(2) : uPhone;
            const uPhoneNo9 = uPhoneNoCountry.length === 11 ? uPhoneNoCountry.slice(0, 2) + uPhoneNoCountry.slice(3) : null;
            const uPhoneLast8 = uPhoneNoCountry.slice(-8);
            if (idDigits.includes(uPhoneNoCountry) || (uPhoneNo9 && idDigits.includes(uPhoneNo9)) || (uPhoneLast8.length === 8 && idDigits.includes(uPhoneLast8))) return true;
        }

        return (uLid && rawId === uLid) || (uJid && rawId === uJid) || u.id === rawId;
    });
    if (matchedUser?.name) return matchedUser.name;

    // 2. Tenta match nos contatos sincronizados
    const matchedWA = waContacts?.find((c: any) => {
        const cPhone = String(c.phoneNumber || '').replace(/\\D/g, '');
        const cLid = String(c.lid || '').split('@')[0];
        const cJid = String(c.jid || '').split('@')[0];

        return (cPhone && (rawId.includes(cPhone) || cPhone.includes(rawId))) || 
               (cLid && rawId === cLid) || 
               (cJid && rawId === cJid);
    });
    if (matchedWA?.name || matchedWA?.pushName) return matchedWA.name || matchedWA.pushName;

    // 3. Fallback para formatação do número
    if (idDigits.startsWith('55') && (idDigits.length === 12 || idDigits.length === 13)) {
        const ddd = idDigits.substring(2, 4);
        const num = idDigits.substring(4);
        return \`(\${ddd}) \${num.length === 9 ? num.slice(0, 5) + '-' + num.slice(5) : num.slice(0, 4) + '-' + num.slice(4)}\`;
    }
    return \`+\${idDigits}\`;
}

// Helper: Extrair Group Detail Sheet Component
export function GroupDetailSheet({ groupDetail, isLoadingDetail, setGroupDetail, resolveUser }: any) {
    if (!groupDetail && !isLoadingDetail) return null;
    return (
        <Sheet open={!!groupDetail} onOpenChange={(open) => !open && setGroupDetail(null)}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    {(isLoadingDetail || groupDetail?._loading) ? (
                        <SheetTitle className="text-muted-foreground">Carregando detalhes...</SheetTitle>
                    ) : (
                        <div className="flex items-center gap-3 mb-2">
                            <Avatar className="h-14 w-14 border-2 shadow">
                                <AvatarFallback className="text-lg font-black bg-emerald-100 text-emerald-800">{groupDetail?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <SheetTitle className="text-left">{groupDetail?.name}</SheetTitle>
                                <p className="text-xs text-muted-foreground">{groupDetail?.size || groupDetail?.participantCount} participantes</p>
                            </div>
                        </div>
                    )}
                    {!isLoadingDetail && !groupDetail?._loading && groupDetail?.description && (
                        <SheetDescription className="text-left text-sm text-foreground/80 whitespace-pre-line">
                            {groupDetail.description}
                        </SheetDescription>
                    )}
                </SheetHeader>

                {(isLoadingDetail || groupDetail?._loading) ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin size-8 text-primary opacity-40" />
                    </div>
                ) : groupDetail && (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Configurações</p>
                            <div className="grid grid-cols-1 gap-2">
                                <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", groupDetail.announce ? "bg-amber-50 border border-amber-200" : "bg-muted/20")}>
                                    <Megaphone size={16} className={groupDetail.announce ? "text-amber-600" : "text-muted-foreground"} />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold">Somente Admins Enviam</p>
                                        <p className="text-[10px] text-muted-foreground">Apenas administradores podem enviar mensagens</p>
                                    </div>
                                    <Badge variant={groupDetail.announce ? "default" : "secondary"} className="text-[10px]">
                                        {groupDetail.announce ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>
                                <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", groupDetail.restrict ? "bg-red-50 border border-red-200" : "bg-muted/20")}>
                                    <Lock size={16} className={groupDetail.restrict ? "text-red-600" : "text-muted-foreground"} />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold">Configurações Restritas</p>
                                        <p className="text-[10px] text-muted-foreground">Apenas admins podem editar info do grupo</p>
                                    </div>
                                    <Badge variant={groupDetail.restrict ? "destructive" : "secondary"} className="text-[10px]">
                                        {groupDetail.restrict ? 'Restrito' : 'Aberto'}
                                    </Badge>
                                </div>
                                {groupDetail.isCommunity !== undefined && (
                                    <div className={cn("flex items-center gap-3 p-2.5 rounded-lg", groupDetail.isCommunity || groupDetail.isCommunityAnnounce ? "bg-blue-50 border border-blue-200" : "bg-muted/20")}>
                                        <Users size={16} className={groupDetail.isCommunity || groupDetail.isCommunityAnnounce ? "text-blue-600" : "text-muted-foreground"} />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold">Comunidade</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {groupDetail.isCommunity ? 'Grupo principal da comunidade' : groupDetail.isCommunityAnnounce ? 'Canal de anúncios da comunidade' : 'Grupo independente'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {groupDetail.admins && groupDetail.admins.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-xl border space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Administradores ({groupDetail.admins.length})</p>
                                {groupDetail.admins.map((admin: any) => (
                                    <div key={admin.id} className="flex items-center gap-2 py-1">
                                        <ShieldCheck size={14} className="text-primary shrink-0" />
                                        <span className="text-xs font-bold text-foreground/80">{resolveUser ? resolveUser(admin.id) : admin.id}</span>
                                        <Badge variant="outline" className="text-[9px] ml-auto capitalize">{admin.role}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

`;
    content = content.replace('function useContactEnrichment(chats: any[]) {', helperFunction + 'function useContactEnrichment(chats: any[]) {');
}

// Remove inner resolveUser definitions and replace with calls to getResolvedUserName
content = content.replace(/const resolveUser = \(adminId: string\) => \{[\s\S]*?rawId;\s*\};/g, 'const resolveUser = (adminId: string) => getResolvedUserName(String(adminId || "").split("@")[0], users, waContacts);');
content = content.replace(/const resolveUser = \(phone: string\) => \{[\s\S]*?return \`\+\$\{digits\}\`;\s*\};/g, 'const resolveUser = (phone: string) => getResolvedUserName(String(phone || "").split("@")[0], users, waContacts);');


// 2. Dependency array no useEffect de fotos
const oldEffect = `        needsPhoto.slice(0, 5).forEach(c => fetchPhoto(c._rawNumber));
    }, [enrichedChats.length, waConfig]);`;
const newEffect = `        needsPhoto.slice(0, 5).forEach(c => fetchPhoto(c._rawNumber));
    }, [enrichedChats.length, waConfig, photoCache]);`;
if (content.includes(oldEffect)) {
    content = content.replace(oldEffect, newEffect);
}


// 4. Race condition em fetchWaData
const oldFetchWaData = `        const fetchWaData = async () => {
            setIsLoadingWaData(true);
            const params = new URLSearchParams({ key: apiKey });
            if (serverUrl) params.set('server', serverUrl);
            const qs = params.toString();
            try {
                const [contactsRes, groupsRes] = await Promise.all([
                    fetch(\`/api/notifications/contacts?\${qs}\`),
                    fetch(\`/api/notifications/groups?\${qs}\`),
                ]);
                const contactsData = await contactsRes.json();
                const groupsData = await groupsRes.json();
                setWaContacts(contactsData.contacts || []);
                setWaGroups(groupsData.groups || []);
            } catch (e) {
                console.warn('Failed to load WA contacts/groups', e);
            } finally {
                setIsLoadingWaData(false);
            }
        };
        fetchWaData();
    }, [config]);`;

const newFetchWaData = `        let cancelled = false;
        const fetchWaData = async () => {
            setIsLoadingWaData(true);
            const params = new URLSearchParams({ key: apiKey });
            if (serverUrl) params.set('server', serverUrl);
            const qs = params.toString();
            try {
                const [contactsRes, groupsRes] = await Promise.all([
                    fetch(\`/api/notifications/contacts?\${qs}\`),
                    fetch(\`/api/notifications/groups?\${qs}\`),
                ]);
                const contactsData = await contactsRes.json();
                const groupsData = await groupsRes.json();
                if (!cancelled) {
                    setWaContacts(contactsData.contacts || []);
                    setWaGroups(groupsData.groups || []);
                }
            } catch (e) {
                if (!cancelled) console.warn('Failed to load WA contacts/groups', e);
            } finally {
                if (!cancelled) setIsLoadingWaData(false);
            }
        };
        fetchWaData();
        return () => { cancelled = true; };
    }, [config]);`;
if (content.includes(oldFetchWaData)) {
    content = content.replace(oldFetchWaData, newFetchWaData);
}

// 5. parseSpreadsheet
const oldParse = `            const name = parts[0]?.trim() || 'Importado';
            const phone = (parts[1] || parts[0])?.replace(/\\D/g, '').trim();
            return { name, phone };`;
const newParse = `            let name = parts[0]?.trim() || 'Importado';
            let phone = (parts[1] || parts[0])?.replace(/\\D/g, '').trim();
            if (parts.length > 1 && parts[0].replace(/\\D/g, '').length > 8) {
                phone = parts[0].replace(/\\D/g, '').trim();
                name = parts[1]?.trim() || 'Importado';
            }
            return { name, phone };`;
if (content.includes(oldParse)) {
    content = content.replace(oldParse, newParse);
}

// 6. Confirmação Todos os Membros
const oldConfirm = `        if (targetAudience === 'specific_members' && selectedUsersList.length === 0) {
            toast({ variant: 'destructive', title: "Usuários ainda carregando ou não selecionados." });
            return;
        }

        setIsLoading(true);`;
const newConfirm = `        if (targetAudience === 'specific_members' && selectedUsersList.length === 0) {
            toast({ variant: 'destructive', title: "Usuários ainda carregando ou não selecionados." });
            return;
        }

        if (targetAudience === 'all_members') {
            const confirmed = window.confirm(\`Você está prestes a enviar uma mensagem para \${users?.length || 0} membros. Tem certeza que deseja continuar?\`);
            if (!confirmed) return;
        }

        setIsLoading(true);`;
if (content.includes(oldConfirm)) {
    content = content.replace(oldConfirm, newConfirm);
}

// 9. checkStatus useCallback
const oldCheckStatus = `    const checkStatus = async () => {`;
const newCheckStatus = `    const checkStatus = React.useCallback(async () => {`;
if (content.includes(oldCheckStatus)) {
    content = content.replace(oldCheckStatus, newCheckStatus);
    
    const endOfCheckStatus = `        } finally { 
            setIsRefreshing(false); 
        }
    };`;
    const newEndOfCheckStatus = `        } finally { 
            setIsRefreshing(false); 
        }
    }, [config, waKey, toast]);`;
    content = content.replace(endOfCheckStatus, newEndOfCheckStatus);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring completed successfully.');
