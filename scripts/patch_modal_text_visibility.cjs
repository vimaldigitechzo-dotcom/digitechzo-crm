const fs = require('fs');

// 1. Update dialog.tsx: ensure DialogHeader has pr-12 sm:pr-14
let dialog = fs.readFileSync('src/components/ui/dialog.tsx', 'utf8');
dialog = dialog.replace(
  'px-4 py-3 sm:px-5 sm:py-3.5 bg-white pr-10 sm:pr-12',
  'px-4 py-3 sm:px-5 sm:py-3.5 bg-white pr-12 sm:pr-14'
);
fs.writeFileSync('src/components/ui/dialog.tsx', dialog, 'utf8');
console.log('dialog.tsx updated');

// 2. Update TeamPage.tsx: move badges inline with member name and add pr-8 so no text ever overlaps with Close 'X'
let team = fs.readFileSync('src/pages/team/TeamPage.tsx', 'utf8');

const oldHeaderRegex = /<DialogHeader>[\s\S]*?<div className="flex items-start justify-between gap-2">[\s\S]*?<div className="flex items-center gap-3">[\s\S]*?<AvatarFallback[\s\S]*?<\/Avatar>[\s\S]*?<div>[\s\S]*?<DialogTitle[\s\S]*?<\/DialogTitle>[\s\S]*?<DialogDescription[\s\S]*?<\/DialogDescription>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<div className="flex flex-col items-end gap-1">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/DialogHeader>/;

const newHeader = `<DialogHeader>
                <div className="flex items-start gap-3 pr-8">
                  <Avatar className="h-10 w-10 border border-border shrink-0 mt-0.5">
                    {selectedMember.avatarUrl && (
                      <AvatarImage
                        src={selectedMember.avatarUrl}
                        alt={\`\${selectedMember.firstName} \${selectedMember.lastName}\`}
                      />
                    )}
                    <AvatarFallback className="bg-slate-100 text-txt-secondary text-xs font-bold">
                      {\`\${(selectedMember.firstName || selectedMember.name || 'U')[0] || ''}\${(selectedMember.lastName || '')[0] || ''}\`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-base font-bold text-txt-primary leading-tight">
                        {selectedMember.firstName} {selectedMember.lastName}
                      </DialogTitle>
                      <Badge variant={getRoleBadgeVariant(selectedMember.role?.name)} className="text-[11px] font-semibold">
                        {getRoleDisplayName(selectedMember.role?.name, selectedMember.role?.displayAlias)}
                      </Badge>
                      <Badge variant={selectedMember.status === 'ACTIVE' ? 'success' : 'neutral'} className="text-[11px] font-semibold">
                        {selectedMember.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-txt-muted break-all">
                      {selectedMember.email} {selectedMember.phone ? \` • \${selectedMember.phone}\` : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>`;

if (oldHeaderRegex.test(team)) {
  team = team.replace(oldHeaderRegex, newHeader);
  fs.writeFileSync('src/pages/team/TeamPage.tsx', team, 'utf8');
  console.log('TeamPage.tsx updated successfully');
} else {
  console.error('oldHeaderRegex did not match in TeamPage.tsx');
}
