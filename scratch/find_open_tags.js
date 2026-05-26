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

function printTags(node) {
    const kindName = ts.SyntaxKind[node.kind];
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    
    if (node.kind === ts.SyntaxKind.JsxOpeningElement || node.kind === ts.SyntaxKind.JsxClosingElement || node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
        console.log(`${kindName} at (${line + 1},${character + 1}): ${node.getText(sourceFile)}`);
    }
    
    ts.forEachChild(node, printTags);
}

printTags(sourceFile);
