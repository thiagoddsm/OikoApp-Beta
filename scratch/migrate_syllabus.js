/**
 * migrate_syllabus.js
 * 
 * Corrige o mapeamento de videos do curso Crescer no banco de dados de produção.
 * 
 * Bug identificado:
 *   Module index 2 ("O Poder da Cruz e Como Vencer...") tem requiredVideoIds: ["2"]  → deve ser ["3"]
 *   Module index 3 ("O Poder da Cruz para Curar Feridas")  tem requiredVideoIds: ["3"]  → deve ser ["4"]
 * 
 * A turma Crescer tem 5 episódios no TheoFlix (índices 0, 1, 2, 3, 4):
 *   [0] Encontrando Deus
 *   [1] O Poder do Perdão - Parte 1
 *   [2] O Poder do Perdão - Parte 2  (estava indo para módulo 2, deveria ir para módulo 1)
 *   [3] O Poder da Cruz e Como Vencer  (deveria ir para módulo 2)
 *   [4] O Poder da Cruz para Curar Feridas (deveria ir para módulo 3)
 */

async function fetchCrescer() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/courses/0p9aolpCoHzGrnnue4nP';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed GET: ${res.status}`);
  return await res.json();
}

async function patchCrescer(newSyllabusJson) {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/courses/0p9aolpCoHzGrnnue4nP?updateMask.fieldPaths=syllabus';
  const body = {
    fields: {
      syllabus: {
        arrayValue: {
          values: newSyllabusJson
        }
      }
    }
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed PATCH: ${res.status} - ${text}`);
  }
  return await res.json();
}

async function run() {
  console.log('=== Crescer Syllabus Migration ===\n');
  
  const doc = await fetchCrescer();
  const syllabusField = doc.fields?.syllabus?.arrayValue?.values || [];
  
  console.log('Current state:');
  syllabusField.forEach((s, idx) => {
    const f = s.mapValue?.fields || {};
    const title = f.title?.stringValue || '(no title)';
    const req = (f.theoflixRequiredVideoIds?.arrayValue?.values || []).map(v => v.stringValue);
    console.log(`  [${idx}] "${title}" → requiredVideoIds: ${JSON.stringify(req)}`);
  });

  // Apply corrections to index 2 and 3
  const newSyllabus = syllabusField.map((s, idx) => {
    if (idx === 2) {
      // "O Poder da Cruz e Como Vencer..." must require episode "3" not "2"
      const f = s.mapValue?.fields || {};
      console.log(`\n✏️  Fixing index 2: changing requiredVideoIds from ["2"] to ["3"]`);
      return {
        mapValue: {
          fields: {
            ...f,
            theoflixRequiredVideoIds: {
              arrayValue: {
                values: [{ stringValue: '3' }]
              }
            }
          }
        }
      };
    } else if (idx === 3) {
      // "O Poder da Cruz para Curar Feridas" must require episode "4" not "3"
      const f = s.mapValue?.fields || {};
      console.log(`✏️  Fixing index 3: changing requiredVideoIds from ["3"] to ["4"]`);
      return {
        mapValue: {
          fields: {
            ...f,
            theoflixRequiredVideoIds: {
              arrayValue: {
                values: [{ stringValue: '4' }]
              }
            }
          }
        }
      };
    }
    return s;
  });

  console.log('\nApplying fix...');
  await patchCrescer(newSyllabus);
  
  console.log('\n✅ Migration complete! Verifying...');
  
  // Verify
  const verifyDoc = await fetchCrescer();
  const verifySyllabus = verifyDoc.fields?.syllabus?.arrayValue?.values || [];
  console.log('\nNew state:');
  verifySyllabus.forEach((s, idx) => {
    const f = s.mapValue?.fields || {};
    const title = f.title?.stringValue || '(no title)';
    const req = (f.theoflixRequiredVideoIds?.arrayValue?.values || []).map(v => v.stringValue);
    console.log(`  [${idx}] "${title}" → requiredVideoIds: ${JSON.stringify(req)}`);
  });
}

run().catch(console.error);
