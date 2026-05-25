'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  cnpj?: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  settings?: {
    primaryColor?: string;
    enabledModules?: string[];
  };
  createdAt?: any;
  updatedAt?: any;
}

export async function listTenants(): Promise<Tenant[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection('tenants').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        slug: data.slug || '',
        active: data.active ?? true,
        cnpj: data.cnpj || '',
        contact: data.contact || {},
        address: data.address || {},
        settings: data.settings || {},
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
      } as Tenant;
    });
  } catch (error: any) {
    console.error('[listTenants] Error:', error);
    throw new Error(error.message || 'Erro ao listar igrejas.');
  }
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('tenants').doc(tenantId).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data()!;
    return {
      id: docSnap.id,
      name: data.name || '',
      slug: data.slug || '',
      active: data.active ?? true,
      cnpj: data.cnpj || '',
      contact: data.contact || {},
      address: data.address || {},
      settings: data.settings || {},
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    } as Tenant;
  } catch (error: any) {
    console.error('[getTenant] Error:', error);
    throw new Error(error.message || 'Erro ao obter dados da igreja.');
  }
}

export async function registerTenant(data: {
  name: string;
  slug: string;
  adminEmail: string;
  cnpj?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  primaryColor?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const db = getAdminDb();
    const slug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      return { success: false, message: 'O slug fornecido é inválido.' };
    }

    const tenantRef = db.collection('tenants').doc(slug);
    const tenantSnap = await tenantRef.get();
    if (tenantSnap.exists) {
      return { success: false, message: `Já existe uma igreja registrada com o identificador (slug) "${slug}".` };
    }

    const email = data.adminEmail.trim().toLowerCase();
    if (!email) {
      return { success: false, message: 'O e-mail do administrador é obrigatório.' };
    }

    // Verificar se o e-mail já está em uso no userTenants
    const emailCheckSnap = await db.collection('userTenants').where('email', '==', email).limit(1).get();
    if (!emailCheckSnap.empty) {
      return { success: false, message: `O e-mail "${email}" já está associado a outro usuário/tenant.` };
    }

    const batch = db.batch();

    // 1. Criar o documento do Tenant em /tenants/{slug}
    const tenantData = {
      id: slug,
      name: data.name.trim(),
      slug: slug,
      active: true,
      cnpj: data.cnpj?.trim() || '',
      contact: {
        email: email,
        phone: data.phone?.trim() || ''
      },
      address: {
        street: data.street?.trim() || '',
        city: data.city?.trim() || '',
        state: data.state?.trim() || '',
        zip: data.zip?.trim() || ''
      },
      settings: {
        primaryColor: data.primaryColor?.trim() || '#4f46e5',
        enabledModules: ['teaching', 'volunteering', 'gcs']
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    batch.set(tenantRef, tenantData);

    // 2. Pre-registrar o admin no indexador global userTenants
    // Geramos um ID temporário "admin_pre_{slug}"
    const tempId = `admin_pre_${slug}`;
    const userTenantRef = db.collection('userTenants').doc(tempId);
    batch.set(userTenantRef, {
      tenantId: slug,
      slug: slug,
      role: 'admin',
      email: email,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 3. Pre-registrar o usuário na coleção /tenants/{slug}/users/{tempId}
    const tenantUserRef = db.collection('tenants').doc(slug).collection('users').doc(tempId);
    batch.set(tenantUserRef, {
      email: email,
      role: 'admin',
      permissions: [],
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 4. Pre-registrar na coleção /tenants/{slug}/members/{tempId}
    const tenantMemberRef = db.collection('tenants').doc(slug).collection('members').doc(tempId);
    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'Igreja';

    batch.set(tenantMemberRef, {
      id: tempId,
      tenantId: slug,
      basic: {
        firstName: firstName,
        lastName: lastName,
        cpf: '',
        sexo: '',
        dataNascimento: '',
        avatar: '',
        photoURL: ''
      },
      contact: {
        phone: data.phone?.trim() || '',
        email: email
      },
      ministerial: {
        batizado: 'nao',
        integrationStatus: 'nao_alcancado'
      },
      services: {
        serviceStatus: 'not_serving'
      },
      family: {
        familyMembers: []
      },
      journey: {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // 5. Pre-registrar na coleção legada /users para compatibilidade total
    const legacyUserRef = db.collection('users').doc(tempId);
    batch.set(legacyUserRef, {
      name: `Admin ${data.name}`,
      email: email,
      phone: data.phone?.trim() || '',
      hierarchy: { role: 'admin' },
      integrationStatus: 'nao_alcancado',
      authUid: tempId,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { success: true, message: `Igreja "${data.name}" registrada com sucesso!` };
  } catch (error: any) {
    console.error('[registerTenant] Error:', error);
    return { success: false, message: error.message || 'Erro ao registrar igreja.' };
  }
}

export async function updateTenant(tenantId: string, data: Partial<Tenant>): Promise<{ success: boolean; message: string }> {
  try {
    const db = getAdminDb();
    const tenantRef = db.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
      return { success: false, message: 'Igreja não encontrada.' };
    }

    const updates: any = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.cnpj !== undefined) updates.cnpj = data.cnpj.trim();
    if (data.active !== undefined) updates.active = data.active;
    
    if (data.contact) {
      const currentContact = tenantSnap.data()?.contact || {};
      updates.contact = {
        ...currentContact,
        ...data.contact
      };
    }

    if (data.address) {
      const currentAddress = tenantSnap.data()?.address || {};
      updates.address = {
        ...currentAddress,
        ...data.address
      };
    }

    if (data.settings) {
      const currentSettings = tenantSnap.data()?.settings || {};
      updates.settings = {
        ...currentSettings,
        ...data.settings
      };
    }

    await tenantRef.update(updates);
    return { success: true, message: 'Configurações da igreja atualizadas com sucesso!' };
  } catch (error: any) {
    console.error('[updateTenant] Error:', error);
    return { success: false, message: error.message || 'Erro ao atualizar configurações da igreja.' };
  }
}
