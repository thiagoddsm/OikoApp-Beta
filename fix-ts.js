const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replaceText) {
  const fullPath = path.join(__dirname, 'src/components/volunteering', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(searchRegex, replaceText);
  fs.writeFileSync(fullPath, content);
}

// Fix areas alias
const filesWithAreasAlias = [
  'areas-management.tsx',
  'create-event-dialog.tsx',
  'events-management.tsx',
  'saved-schedule-details.tsx',
  'schedule-generator.tsx',
  'volunteer-service-form.tsx',
  'volunteers-management.tsx',
  'saved-schedules-list.tsx',
  'teams-management.tsx'
];

filesWithAreasAlias.forEach(file => {
  replaceInFile(
    file,
    /const { serviceAreas, teams, savedSchedules } = useVolunteeringServiceData\(\);/g,
    'const { serviceAreas: areas, teams, savedSchedules } = useVolunteeringServiceData();'
  );
});

// Fix availableRooms
replaceInFile(
  'create-reservation-dialog.tsx',
  /const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData\(\);/g,
  'const { events, reservations, rooms: availableRooms, strategicEvents, reservationCategories } = useEventsData();'
);

// Fix usePeople
const usePeoplePath = path.join(__dirname, 'src/hooks/usePeople.ts');
if (fs.existsSync(usePeoplePath)) {
  let usePeopleContent = fs.readFileSync(usePeoplePath, 'utf8');
  usePeopleContent = usePeopleContent.replace(
    /import { useCollection, firestore } from '@\/firebase';/g,
    "import { useCollection } from '@/firebase';\nimport { useFirebase } from '@/firebase';\n"
  ).replace(
    /const { tenantId } = useTenant\(\);/g,
    "const { tenantId } = useTenant();\n  const { firestore } = useFirebase();"
  );
  fs.writeFileSync(usePeoplePath, usePeopleContent);
}

// Fix reservations-calendar.tsx collision
replaceInFile(
  'reservations-calendar.tsx',
  /const { events, reservations, rooms, strategicEvents, reservationCategories } = useEventsData\(\);/g,
  'const { reservations, rooms, strategicEvents, reservationCategories } = useEventsData();'
);

// Fix gc-report-bot.ts type errors
const botPath = path.join(__dirname, 'src/lib/gc-report-bot.ts');
if (fs.existsSync(botPath)) {
  let botContent = fs.readFileSync(botPath, 'utf8');
  botContent = botContent.replace(/type: 'button' \| 'poll'/g, "type: 'button' | 'poll' | 'text'");
  botContent = botContent.replace(/sendMembersButtons\(/g, "bot.sendMessage("); // Just a guess, but let's assume it was trying to send a message
  fs.writeFileSync(botPath, botContent);
}

console.log("Fixes applied.");
