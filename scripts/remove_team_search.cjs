const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/team/TeamPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove SearchInput import
content = content.replace("import { SearchInput } from '@/components/common/SearchInput';\n", "");

// 2. Remove the search input block from toolbar
const targetBlock = `      {/* 3. Search & Compact Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="w-full sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search member by name, email, team..."
            />
          </div>
          <FilterPills
            options={filterOptions}
            activeId={roleFilter}
            onChange={setRoleFilter}
          />
        </div>

        {(searchQuery || roleFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-2 text-xs text-txt-muted hover:text-txt-primary self-end sm:self-auto cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>`;

const replBlock = `      {/* 3. Compact Role Filters Toolbar */}
      <div className="flex items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          <FilterPills
            options={filterOptions}
            activeId={roleFilter}
            onChange={setRoleFilter}
          />
        </div>

        {roleFilter !== 'ALL' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-2 text-xs text-txt-muted hover:text-txt-primary shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetBlock.replace(/\r\n/g, '\n');
const normRepl = replBlock.replace(/\r\n/g, '\n');

if (!normContent.includes(normTarget)) {
  console.error('Target toolbar block not found!');
  process.exit(1);
}

const updated = normContent.replace(normTarget, normRepl);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Successfully removed search input from TeamPage.tsx!');
