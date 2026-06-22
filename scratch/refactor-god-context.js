const { Project, SyntaxKind, ObjectBindingPattern } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
});

const sourceFiles = project.getSourceFiles('src/**/*.tsx');

let changedFiles = 0;

sourceFiles.forEach(sourceFile => {
  let needsMembers = false;
  let needsEvents = false;
  let needsCourses = false;
  let needsTeachingFinance = false;
  let needsMinisterialFinance = false;
  let needsGC = false;
  let needsVolunteeringService = false;
  
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  const useVolunteeringCalls = callExpressions.filter(c => c.getExpression().getText() === 'useVolunteering');
  
  if (useVolunteeringCalls.length === 0) return;

  useVolunteeringCalls.forEach(call => {
    const parent = call.getParentIfKind(SyntaxKind.VariableDeclaration);
    if (!parent) return;

    const nameNode = parent.getNameNode();
    if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
      const elements = nameNode.getElements();
      
      const propertiesExtracted = elements.map(e => {
        return e.getPropertyNameNode() ? e.getPropertyNameNode().getText() : e.getNameNode().getText();
      });

      if (propertiesExtracted.some(p => ['users'].includes(p))) needsMembers = true;
      if (propertiesExtracted.some(p => ['events', 'reservations', 'rooms', 'strategicEvents', 'reservationCategories'].includes(p))) needsEvents = true;
      if (propertiesExtracted.some(p => ['courses', 'classes', 'enrollmentRequests', 'pedagogicalLogs', 'theoflixCourses'].includes(p))) needsCourses = true;
      if (propertiesExtracted.some(p => ['wavePayments', 'disPayments', 'wavePlans', 'disPlans', 'waveExpenses'].includes(p))) needsTeachingFinance = true;
      if (propertiesExtracted.some(p => ['financialTransactions', 'financeRequests'].includes(p))) needsMinisterialFinance = true;
      if (propertiesExtracted.some(p => ['cells', 'areas', 'redes'].includes(p))) needsGC = true;
      if (propertiesExtracted.some(p => ['serviceAreas', 'teams', 'savedSchedules'].includes(p))) needsVolunteeringService = true;
    }
  });

  const importsToAdd = [];
  if (needsMembers) importsToAdd.push('useMembersData');
  if (needsEvents) importsToAdd.push('useEventsData');
  if (needsCourses) importsToAdd.push('useCoursesData');
  if (needsTeachingFinance) importsToAdd.push('useTeachingFinance');
  if (needsMinisterialFinance) importsToAdd.push('useMinisterialFinance');
  if (needsGC) importsToAdd.push('useGCData');
  if (needsVolunteeringService) importsToAdd.push('useVolunteeringServiceData');

  if (importsToAdd.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '@/hooks/useDomainData',
      namedImports: importsToAdd
    });

    const firstCall = useVolunteeringCalls[0];
    const statement = firstCall.getFirstAncestorByKind(SyntaxKind.VariableStatement);
    
    if (statement) {
      const block = statement.getParentIfKind(SyntaxKind.Block);
      if (block) {
        const index = block.getStatements().indexOf(statement);
        
        let injectStr = '';
        if (needsMembers) injectStr += `const { users } = useMembersData();\n`;
        if (needsEvents) injectStr += `const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData();\n`;
        if (needsCourses) injectStr += `const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();\n`;
        if (needsTeachingFinance) injectStr += `const { wavePayments, disPayments, wavePlans, disPlans, waveExpenses } = useTeachingFinance();\n`;
        if (needsMinisterialFinance) injectStr += `const { financialTransactions, financeRequests } = useMinisterialFinance();\n`;
        if (needsGC) injectStr += `const { cells, areas, redes } = useGCData();\n`;
        if (needsVolunteeringService) injectStr += `const { serviceAreas, teams, savedSchedules } = useVolunteeringServiceData();\n`;

        useVolunteeringCalls.forEach(call => {
            const parent = call.getParentIfKind(SyntaxKind.VariableDeclaration);
            if (!parent) return;
            const nameNode = parent.getNameNode();
            if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
                const elements = nameNode.getElements();
                const toRemove = ['users', 'events', 'reservations', 'rooms', 'strategicEvents', 'reservationCategories', 'courses', 'classes', 'enrollmentRequests', 'pedagogicalLogs', 'theoflixCourses', 'wavePayments', 'disPayments', 'wavePlans', 'disPlans', 'waveExpenses', 'financialTransactions', 'financeRequests', 'cells', 'areas', 'redes', 'serviceAreas', 'teams', 'savedSchedules'];
                
                const keptElements = [];
                elements.forEach(e => {
                    const propName = e.getPropertyNameNode() ? e.getPropertyNameNode().getText() : e.getNameNode().getText();
                    if (!toRemove.includes(propName)) {
                        keptElements.push(e.getText());
                    }
                });

                if (keptElements.length > 0) {
                    parent.replaceWithText(`{ ${keptElements.join(', ')} } = useVolunteering()`);
                } else {
                    const statement = parent.getFirstAncestorByKind(SyntaxKind.VariableStatement);
                    if (statement) statement.remove();
                }
            }
        });

        block.insertStatements(index, injectStr);
        changedFiles++;
      }
    }
  }
});

project.saveSync();
console.log(`Refactored ${changedFiles} files!`);
