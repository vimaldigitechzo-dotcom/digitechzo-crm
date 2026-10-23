const fs = require('fs');

let s = fs.readFileSync('src/layouts/Sidebar.tsx', 'utf8');

const targetDecl = "const isAccentDark = isColorDark(appliedTheme.accentColor);";
const replacementDecl = `const isAccentDark = isColorDark(appliedTheme.accentColor);
  const displayName = user?.name || (user ? \`\${user.firstName || ''} \${user.lastName || ''}\`.trim() : '') || 'Administrator';
  const displayInitial = (user?.firstName?.[0] || user?.name?.[0] || 'A').toUpperCase();`;

s = s.replace(targetDecl, replacementDecl);
s = s.replaceAll('{user ? `${user.firstName} ${user.lastName}` : \'Administrator\'}', '{displayName}');
s = s.replaceAll('title={user ? `${user.firstName} ${user.lastName}` : \'Administrator\'}', 'title={displayName}');
s = s.replaceAll("{user?.firstName?.[0] || 'U'}", '{displayInitial}');

fs.writeFileSync('src/layouts/Sidebar.tsx', s, 'utf8');
console.log('Sidebar updated successfully');
