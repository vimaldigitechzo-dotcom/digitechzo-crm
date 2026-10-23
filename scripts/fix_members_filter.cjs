const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/team/TeamPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  const members: TeamUserItem[] = useMemo(() => {
    if (usersQuery.data?.data && usersQuery.data.data.length > 0) {
      return usersQuery.data.data;
    }
    // If query has error or empty, provide mock/demo members so screen is never blank
    if (usersQuery.isError) {
      return fallbackMembers;
    }
    return usersQuery.data?.data || [];
  }, [usersQuery.data, usersQuery.isError, fallbackMembers]);`;

const replacement = `  const members: TeamUserItem[] = useMemo(() => {
    let list: TeamUserItem[] = [];
    if (usersQuery.data?.data && usersQuery.data.data.length > 0) {
      list = usersQuery.data.data;
    } else if (usersQuery.isError) {
      list = fallbackMembers;
    } else {
      list = usersQuery.data?.data || [];
    }

    // Completely remove and exclude the specified account
    return list.filter((m) => {
      if (removedUserIds.includes(m.id)) return false;
      if (m.id === '121fc497-45c4-4096-9cb0-add599bcb1c6') return false;
      if (m.email?.toLowerCase() === 'vimaldigitechzo@gmail.com') return false;
      if (m.name?.toLowerCase().includes('sekar babu new')) return false;
      return true;
    });
  }, [usersQuery.data, usersQuery.isError, fallbackMembers, removedUserIds]);`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normRepl = replacement.replace(/\r\n/g, '\n');

if (!normContent.includes(normTarget)) {
  console.error('Target not found in TeamPage.tsx!');
  process.exit(1);
}

const updated = normContent.replace(normTarget, normRepl);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Successfully replaced members filter in TeamPage.tsx!');
