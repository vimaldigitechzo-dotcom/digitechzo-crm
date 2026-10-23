const fs = require('fs');

// CustomersPage.tsx
let cust = fs.readFileSync('src/pages/customers/CustomersPage.tsx', 'utf8');
const custOld = `<DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <DialogTitle className="text-base font-bold text-txt-primary flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#57B71B] shrink-0" />
                      <span>{selectedCustomer.companyName}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-txt-muted mt-0.5">
                      Account 360 Profile & Overview
                    </DialogDescription>
                  </div>
                  {getStatusBadge(selectedCustomer.status)}
                </div>
              </DialogHeader>`;

const custNew = `<DialogHeader>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base font-bold text-txt-primary flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#57B71B] shrink-0" />
                      <span>{selectedCustomer.companyName}</span>
                    </DialogTitle>
                    {getStatusBadge(selectedCustomer.status)}
                  </div>
                  <DialogDescription className="text-xs text-txt-muted mt-0.5">
                    Account 360 Profile & Overview
                  </DialogDescription>
                </div>
              </DialogHeader>`;

if (cust.includes(custOld)) {
  fs.writeFileSync('src/pages/customers/CustomersPage.tsx', cust.replace(custOld, custNew), 'utf8');
  console.log('CustomersPage.tsx updated');
} else {
  // Try CRLF normalized
  cust = cust.replace(/\r\n/g, '\n');
  if (cust.includes(custOld)) {
    fs.writeFileSync('src/pages/customers/CustomersPage.tsx', cust.replace(custOld, custNew), 'utf8');
    console.log('CustomersPage.tsx updated (normalized)');
  } else {
    console.log('CustomersPage.tsx target not matched');
  }
}

// ProposalsPage.tsx
let prop = fs.readFileSync('src/pages/proposals/ProposalsPage.tsx', 'utf8');
const propOld = `<DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-btn border bg-emerald-50 border-emerald-200/60 text-[#57B71B]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-txt-primary font-mono">
                      {selectedProposal.quoteNumber}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-txt-muted">
                      {selectedProposal.versionLabel} • {selectedProposal.companyName}
                    </DialogDescription>
                  </div>
                </div>
                {getStatusBadge(selectedProposal.status)}
              </div>
            </DialogHeader>`;

const propNew = `<DialogHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-btn border bg-emerald-50 border-emerald-200/60 text-[#57B71B]">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base font-bold text-txt-primary font-mono">
                      {selectedProposal.quoteNumber}
                    </DialogTitle>
                    {getStatusBadge(selectedProposal.status)}
                  </div>
                  <DialogDescription className="text-xs text-txt-muted">
                    {selectedProposal.versionLabel} • {selectedProposal.companyName}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>`;

if (prop.includes(propOld)) {
  fs.writeFileSync('src/pages/proposals/ProposalsPage.tsx', prop.replace(propOld, propNew), 'utf8');
  console.log('ProposalsPage.tsx updated');
} else {
  prop = prop.replace(/\r\n/g, '\n');
  if (prop.includes(propOld)) {
    fs.writeFileSync('src/pages/proposals/ProposalsPage.tsx', prop.replace(propOld, propNew), 'utf8');
    console.log('ProposalsPage.tsx updated (normalized)');
  } else {
    console.log('ProposalsPage.tsx target not matched');
  }
}
