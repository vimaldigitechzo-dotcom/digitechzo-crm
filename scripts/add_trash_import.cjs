const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/team/TeamPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "  Mail,\n  Phone,\n} from 'lucide-react';",
  "  Mail,\n  Phone,\n  Trash2,\n} from 'lucide-react';"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added Trash2 to imports!');
