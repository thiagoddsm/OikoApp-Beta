import jsPDF from 'jspdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, type Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CertificateData {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  trackName?: string;
  workloadHours?: number;
  completionDate?: Date | string;
  signatoryName?: string;
  signatureUrl?: string;
  authenticityCode?: string;
}

/**
 * Converte uma URL de imagem para base64 com tratamento seguro contra falhas e CORS.
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (e) {
          console.warn('[CertificateGenerator] Falha ao converter imagem em canvas:', e);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('[CertificateGenerator] Falha ao carregar imagem para o certificado:', imageUrl);
        resolve(null);
      };
      img.src = imageUrl;
    } catch (e) {
      console.warn('[CertificateGenerator] Erro geral ao processar imagem:', e);
      resolve(null);
    }
  });
}

/**
 * Gera o documento jsPDF oficial do certificado digital no padrão oficial da Igreja Batista da Manhã.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<jsPDF> {
  // Orientação Paisagem (Landscape) formato A4: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const centerX = pageWidth / 2;

  // ── 1. BORDAS E MOLDURA DE LUXO ──────────────────────────────────────────
  // Fundo bege claríssimo quase branco para acabamento nobre de diploma
  doc.setFillColor(254, 254, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Moldura Externa (Azul Noite / Slate Escuro)
  doc.setDrawColor(15, 23, 42); // #0F172A
  doc.setLineWidth(1.6);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  // Moldura Interna (Dourado Nobre)
  doc.setDrawColor(202, 138, 4); // #CA8A04
  doc.setLineWidth(0.7);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

  // Ornamentos de Canto (Cantoneiras em dourado)
  const drawCornerAccent = (x: number, y: number, dirX: number, dirY: number) => {
    doc.setDrawColor(202, 138, 4);
    doc.setLineWidth(1.2);
    // Linha horizontal
    doc.line(x, y, x + (dirX * 8), y);
    // Linha vertical
    doc.line(x, y, x, y + (dirY * 8));
    // Pequeno ponto no vértice
    doc.setFillColor(202, 138, 4);
    doc.circle(x + (dirX * 2), y + (dirY * 2), 0.6, 'F');
  };

  drawCornerAccent(14, 14, 1, 1);       // Superior esquerdo
  drawCornerAccent(pageWidth - 14, 14, -1, 1); // Superior direito
  drawCornerAccent(14, pageHeight - 14, 1, -1); // Inferior esquerdo
  drawCornerAccent(pageWidth - 14, pageHeight - 14, -1, -1); // Inferior direito

  // ── 2. CABEÇALHO INSTITUCIONAL ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text('IGREJA BATISTA DA MANHÃ', centerX, 27, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('MINISTÉRIO DE ENSINO  •  ACADEMIA LUMINE', centerX, 32.5, { align: 'center' });

  // ── 3. TÍTULO DO CERTIFICADO ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICADO DE CONCLUSÃO', centerX, 47, { align: 'center' });

  // Divisor decorativo central dourado
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.6);
  doc.line(centerX - 45, 51.5, centerX + 45, 51.5);
  doc.setFillColor(202, 138, 4);
  doc.circle(centerX, 51.5, 1.1, 'F');

  // ── 4. CORPO DO TEXTO (PREÂMBULO & NOME DO ALUNO) ─────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('Certificamos, para os devidos fins de formação e edificação, que', centerX, 64, { align: 'center' });

  // Nome do Aluno em Destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  const formattedStudentName = (data.studentName || 'Aluno').toUpperCase();
  doc.text(formattedStudentName, centerX, 79, { align: 'center' });

  // Linha sutil abaixo do nome
  const nameWidth = doc.getTextWidth(formattedStudentName);
  const underlinePadding = 8;
  const lineStart = Math.max(25, centerX - (nameWidth / 2) - underlinePadding);
  const lineEnd = Math.min(pageWidth - 25, centerX + (nameWidth / 2) + underlinePadding);
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(lineStart, 83, lineEnd, 83);

  // ── 5. CURSO E CARGA HORÁRIA ─────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);
  doc.text('concluiu com êxito todas as exigências acadêmicas, práticas e espirituais do curso', centerX, 93, { align: 'center' });

  // Nome do Curso em destaque Dourado/Âmbar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text((data.courseName || 'Curso').toUpperCase(), centerX, 104, { align: 'center' });

  // Detalhes do Trilho e Carga Horária
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const track = data.trackName || 'Trilho de Formação e Crescimento Ministerial';
  const hours = data.workloadHours || 20;
  doc.text(`Integrado ao ${track}, cumprindo a carga horária de ${hours} horas de ensino.`, centerX, 114, { align: 'center' });

  // ── 6. DATA E LOCAL ──────────────────────────────────────────────────────
  let parsedDate = new Date();
  if (data.completionDate) {
    parsedDate = typeof data.completionDate === 'string' ? new Date(data.completionDate) : data.completionDate;
    if (isNaN(parsedDate.getTime())) parsedDate = new Date();
  }
  const dateStr = format(parsedDate, "'São Gonçalo - RJ,' d 'de' MMMM 'de' yyyy", { locale: ptBR });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(dateStr, centerX, 126, { align: 'center' });

  // ── 7. ÁREA DE ASSINATURAS ───────────────────────────────────────────────
  const sigY = 166;
  const leftSigCenterX = 80;
  const rightSigCenterX = 217;

  // Assinatura 1: Coordenação Pedagógica
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.4);
  doc.line(leftSigCenterX - 35, sigY, leftSigCenterX + 35, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Coordenação Pedagógica', leftSigCenterX, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Ministério de Ensino  •  IBM', leftSigCenterX, sigY + 9.5, { align: 'center' });

  // Assinatura 2: Pastor Sênior (com suporte à imagem digitalizada se configurada)
  if (data.signatureUrl) {
    try {
      const base64Sig = await getBase64ImageFromUrl(data.signatureUrl);
      if (base64Sig) {
        // Posicionar imagem da assinatura centralizada logo acima da linha
        doc.addImage(base64Sig, 'PNG', rightSigCenterX - 22, sigY - 17, 44, 15);
      }
    } catch (e) {
      console.warn('[CertificateGenerator] Não foi possível carregar assinatura no PDF:', e);
    }
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(rightSigCenterX - 35, sigY, rightSigCenterX + 35, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(data.signatoryName || 'Pr. Thiago Moura', rightSigCenterX, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Pastor Sênior  •  Igreja Batista da Manhã', rightSigCenterX, sigY + 9.5, { align: 'center' });

  // ── 8. RODAPÉ DE VALIDAÇÃO E AUTENTICIDADE ───────────────────────────────
  const authCode = data.authenticityCode || `IBM-${(data.studentId || 'STUDENT').slice(-6).toUpperCase()}-${(data.courseId || 'CRS').slice(-4).toUpperCase()}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`CÓDIGO DE AUTENTICIDADE: ${authCode}`, 16, 192);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento digital oficial emitido e validado pela plataforma OikoApp  •  Igreja Batista da Manhã', 16, 196);

  // Selo textual à direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // Âmbar
  doc.text('★  CERTIFICADO OFICIAL REGISTRADO  ★', pageWidth - 16, 194, { align: 'right' });

  return doc;
}

/**
 * Utilitário completo: Gera o certificado e faz o upload automático no Firebase Storage,
 * salvando a URL gerada no perfil do aluno em `journey.certificates.${courseId}`.
 */
export async function generateAndSaveCertificate(params: {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  trackName?: string;
  workloadHours?: number;
  completionDate?: Date | string;
  firestore: Firestore;
  storage: FirebaseStorage;
}): Promise<string> {
  const { studentId, studentName, courseId, courseName, trackName, workloadHours, completionDate, firestore, storage } = params;

  // 1. Busca configurações do Pastor Sênior salvas no tenant
  let signatoryName = 'Pr. Thiago Moura';
  let signatureUrl: string | undefined = undefined;

  try {
    const tenantDoc = await getDoc(doc(firestore, 'config', 'tenant_details'));
    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data();
      if (tenantData.signatoryName) signatoryName = tenantData.signatoryName;
      if (tenantData.signatureUrl) signatureUrl = tenantData.signatureUrl;
    }
  } catch (e) {
    console.warn('[CertificateGenerator] Erro ao carregar config/tenant_details, usando defaults:', e);
  }

  // 2. Gera o PDF oficial com jsPDF
  const docPdf = await generateCertificatePdf({
    studentId,
    studentName,
    courseId,
    courseName,
    trackName,
    workloadHours,
    completionDate,
    signatoryName,
    signatureUrl
  });

  const pdfBlob = docPdf.output('blob');

  // 3. Salva no Firebase Storage em `certificates/${studentId}/${courseId}.pdf`
  const fileRef = ref(storage, `certificates/${studentId}/${courseId}.pdf`);
  await uploadBytes(fileRef, pdfBlob, {
    contentType: 'application/pdf',
    customMetadata: {
      studentId,
      studentName,
      courseId,
      courseName,
      generatedAt: new Date().toISOString()
    }
  });

  const downloadUrl = await getDownloadURL(fileRef);

  // 4. Atualiza o perfil do aluno no Firestore
  const userRef = doc(firestore, 'users', studentId);
  await updateDoc(userRef, {
    [`journey.certificates.${courseId}`]: downloadUrl
  });

  return downloadUrl;
}
