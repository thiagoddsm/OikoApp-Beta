
import { Timestamp } from 'firebase/firestore';

export interface Person {
  // Personal & Identification
  id: string;
  code?: string; // CODIGO
  name: string; // NOME
  birthDate?: Timestamp | null; // NASCIMENTO
  gender?: 'Masculino' | 'Feminino' | 'Outro'; // SEXO
  rg?: string; // RG
  cpf?: string; // CPF
  maritalStatus?: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | 'Outro'; // ESTADO CIVIL
  nationality?: string; // NATURAL
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'; // TIPO SANGUINEO
  organDonor?: boolean; // DOADOR

  // Residential Address
  address?: {
    cep?: string; // CEP
    street?: string; // ENDERECO
    number?: string; // NUMERO
    complement?: string; // COMPLEMENTO
    neighborhood?: string; // BAIRRO
    city?: string; // CIDADE
    state?: string; // UF
  };

  // Personal Contacts
  contacts?: {
    phone?: string; // TELEFONE
    cellPhone?: string; // CELULAR
    backupPhone?: string; // TELEFONE RECADO
    backupContactName?: string; // RECADO (Nome de quem recebe o recado)
    email?: string; // EMAIL
  };

  // Professional & Commercial Address
  professional?: {
    educationLevel?: 'Analfabeto' | 'Fundamental Incompleto' | 'Fundamental Completo' | 'Médio Incompleto' | 'Médio Completo' | 'Superior Incompleto' | 'Superior Completo' | 'Pós-graduação' | 'Mestrado' | 'Doutorado'; // ESCOLARIDADE
    profession?: string; // PROFISSAO
    companyName?: string; // NOME EMPRESA
    commercialAddress?: {
      cep?: string; // CEP COMERCIAL
      street?: string; // ENDERECO COMERCIAL
      number?: string; // NUMERO COMERCIAL
      complement?: string; // COMPLEMENTO COMERCIAL
      neighborhood?: string; // BAIRRO COMERCIAL
      city?: string; // CIDADE COMERCIAL
      state?: string; // UF (Comercial)
    };
    commercialPhone?: string; // TELEFONE COM.
    commercialCellPhone?: string; // CELULAR COM.
    commercialBackupPhone?: string; // TELEFONE RECADO COM.
    commercialBackupContactName?: string; // RECADO (Comercial)
    commercialEmail?: string; // EMAIL COMERCIAL
  };

  // Church/System Control
  churchData?: {
    memberOf?: string; // IGREJA
    registrationDate?: Timestamp | null; // DATA CADASTRO
    lastUpdate?: Timestamp | null; // ULTIMA ALTERACAO
    membershipRoll?: string; // ARROLAMENTO
    baptismDate?: Timestamp | null; // DATA DO BATISMO — preenchida indica batizado
    smallGroup?: string; // PG (Pequeno Grupo)
    integrationStatus?: string;
    interests?: string[];
  };

  // Oiko legacy fields (can be deprecated or migrated)
  photoURL?: string;
  role?: string; // Supervisor, Líder, etc.
  status?: 'active' | 'inactive' | 'pending';
  gc?: string; // Name or ID of the small group
}
