const ts = require('typescript');
const fs = require('fs');

const file = 'src/contexts/TeachingContext.tsx';
const content = fs.readFileSync(file, 'utf8');

const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);

console.log("Syntactic diagnostics count:", sourceFile.parseDiagnostics.length);
sourceFile.parseDiagnostics.forEach(diag => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    console.log(`${file} (${line + 1},${character + 1}): ${message}`);
});
