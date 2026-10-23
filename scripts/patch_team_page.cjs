const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/team/TeamPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Table actions replacement
const targetTable = `<TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMember(member)}
                          className="h-7 text-xs px-2 text-txt-secondary hover:text-txt-primary hover:bg-slate-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Profile
                        </Button>
                      </TableCell>`;

const replTable = `<TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMember(member)}
                            className="h-7 text-xs px-2 text-txt-secondary hover:text-txt-primary hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Profile
                          </Button>
                          {member.role?.name !== 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMember(member)}
                              className="h-7 text-xs px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              title="Remove Account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>`;

// Mobile card action replacement
const targetMobile = `<Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMember(member)}
                      className="flex-1 h-8 text-xs font-medium cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Profile
                    </Button>`;

const replMobile = `<Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMember(member)}
                      className="flex-1 h-8 text-xs font-medium cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Profile
                    </Button>
                    {member.role?.name !== 'ADMIN' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(member)}
                        className="h-8 text-xs px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                        title="Remove Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}`;

// Modal footer replacement
const targetModal = `{selectedMember.status === 'ACTIVE' ? 'Deactivate Member' : 'Reactivate Member'}
                </Button>`;

const replModal = `{selectedMember.status === 'ACTIVE' ? 'Deactivate Member' : 'Reactivate Member'}
                </Button>
                {selectedMember.role?.name !== 'ADMIN' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleDeleteMember(selectedMember)}
                    className="h-8 text-xs font-medium cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove Account
                  </Button>
                )}`;

// Normalize newlines before replacing
function replaceExact(str, find, rep) {
  const normStr = str.replace(/\r\n/g, '\n');
  const normFind = find.replace(/\r\n/g, '\n');
  const normRep = rep.replace(/\r\n/g, '\n');
  if (!normStr.includes(normFind)) {
    console.error('NOT FOUND:', normFind.slice(0, 50));
    return str;
  }
  return normStr.replace(normFind, normRep);
}

content = replaceExact(content, targetTable, replTable);
content = replaceExact(content, targetMobile, replMobile);
content = replaceExact(content, targetModal, replModal);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch 2 applied successfully!');
