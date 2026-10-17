const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 0: Checking Database Prerequisites ---');
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'DigiTechzo Media & Technologies',
        slug: 'digitechzo',
        status: 'ACTIVE',
      },
    });
    console.log('Created Organization:', org.name);
  } else {
    console.log('Found Organization:', org.name, org.id);
  }

  let adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { name: 'ADMIN', description: 'System Administrator', isSystem: true },
    });
  }

  let user = await prisma.user.findFirst({ where: { organizationId: org.id } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        roleId: adminRole.id,
        name: 'DigiTechzo Administrator',
        email: 'admin@digitechzo.com',
        phone: '+91 98765 43210',
        passwordHash: 'dummy_hash',
        status: 'ACTIVE',
      },
    });
    console.log('Created User:', user.name);
  } else {
    console.log('Found User:', user.name, user.id);
  }

  let stage = await prisma.pipelineStage.findFirst({ orderBy: { order: 'asc' } });
  if (!stage) {
    stage = await prisma.pipelineStage.create({
      data: {
        name: 'Discovery',
        order: 1,
        stageType: 'OPEN',
      },
    });
  }

  console.log('\n--- Step 1: Creating Lead for Vimal ---');
  // Check if lead already exists
  let lead = await prisma.lead.findFirst({
    where: { phone: '1234567890', organizationId: org.id, deletedAt: null },
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        ownerId: user.id,
        fullName: 'Vimal',
        companyName: 'Vimal Enterprises',
        title: 'Founder & CEO',
        phone: '1234567890',
        email: 'vimal@enterprises.com',
        source: 'MANUAL',
        status: 'NEW',
        priority: 'HIGH',
        temperature: 'HOT',
        leadScore: 85,
        serviceInterest: 'Custom Web Application Development',
        category: 'Full-Stack Software',
        nextActionDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nextActionType: 'CALL',
        nextActionPurpose: 'Initial Discovery Call with Vimal',
      },
    });
    console.log('✅ Lead Created Successfully:');
    console.log({
      id: lead.id,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      company: lead.companyName,
      status: lead.status,
      temperature: lead.temperature,
      serviceInterest: lead.serviceInterest,
    });
  } else {
    console.log('Lead already exists:', lead.id, lead.fullName);
  }

  console.log('\n--- Step 2: Promoting Lead to Pipeline Deal ---');
  let deal = await prisma.deal.findFirst({
    where: { leadId: lead.id, organizationId: org.id, deletedAt: null },
  });

  if (!deal) {
    deal = await prisma.deal.create({
      data: {
        organizationId: org.id,
        ownerId: user.id,
        leadId: lead.id,
        stageId: stage.id,
        title: 'Web Platform Development - Vimal Enterprises',
        value: 450000.0,
        expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        probability: 60,
        status: 'OPEN',
      },
    });
    console.log('✅ Pipeline Deal Created:');
    console.log({
      id: deal.id,
      title: deal.title,
      value: `₹${deal.value}`,
      probability: `${deal.probability}%`,
      stage: stage.name,
    });
  } else {
    console.log('Deal already exists:', deal.id, deal.title);
  }

  console.log('\n--- Step 3: Scheduling a Technical Meeting with WhatsApp Invitation ---');
  let meeting = await prisma.meeting.findFirst({
    where: { leadId: lead.id, organizationId: org.id, deletedAt: null },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0); // 3:00 PM
  const endTime = new Date(tomorrow.getTime() + 45 * 60 * 1000); // 3:45 PM

  const meetUrl = 'https://meet.google.com/iqi-qsmu-muu';
  const whatsappMsg = `Hi Vimal,\nAs informed, I'll be available to meet you today. I've created a Google Meet for the discussion.\nSharing the meeting link below, please join at 03:00 PM.\nLink: ${meetUrl}\n\nLooking forward to speaking with you!`;

  if (!meeting) {
    meeting = await prisma.meeting.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        dealId: deal.id,
        title: 'Discovery & Architecture Discussion with Vimal',
        meetingType: 'DEMO',
        startTime: tomorrow,
        endTime: endTime,
        duration: '45 min',
        meetingUrl: meetUrl,
        location: meetUrl,
        whatsappMessage: whatsappMsg,
        ownerId: user.id,
        status: 'SCHEDULED',
        notes: 'Discussion about custom CRM requirements and deployment schedule.',
      },
    });
    console.log('✅ Meeting Scheduled:');
    console.log({
      id: meeting.id,
      title: meeting.title,
      startTime: meeting.startTime.toLocaleString(),
      meetingUrl: meeting.meetingUrl,
      whatsappMessagePreview: whatsappMsg.slice(0, 80) + '...',
    });
  } else {
    console.log('Meeting already exists:', meeting.id, meeting.title);
  }

  console.log('\n--- Step 4: Creating Follow-up Task & Activity Log ---');
  let task = await prisma.task.findFirst({
    where: { leadId: lead.id, organizationId: org.id, deletedAt: null },
  });

  if (!task) {
    task = await prisma.task.create({
      data: {
        organizationId: org.id,
        assigneeId: user.id,
        leadId: lead.id,
        dealId: deal.id,
        taskType: 'FOLLOW_UP',
        title: 'Send Post-Meeting Scope Document to Vimal',
        description: 'Prepare detailed quote and architecture scope notes after tomorrow 3 PM call.',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'HIGH',
        status: 'PENDING',
      },
    });

    await prisma.activity.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        leadId: lead.id,
        dealId: deal.id,
        taskId: task.id,
        activityType: 'CALL',
        direction: 'OUTBOUND',
        subject: 'Introductory call with Vimal',
        description: 'Connected with Vimal on 1234567890. Expressed strong interest in Web App Development.',
        outcome: 'Interested - Scheduled Demo Call for tomorrow.',
      },
    });
    console.log('✅ Task and Activity Logged:');
    console.log({
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate.toLocaleDateString(),
    });
  } else {
    console.log('Task already exists:', task.id, task.title);
  }

  console.log('\n--- Step 5: Generating Commercial Proposal with Line Items ---');
  let proposal = await prisma.proposal.findFirst({
    where: { leadId: lead.id, organizationId: org.id, deletedAt: null },
  });

  if (!proposal) {
    proposal = await prisma.proposal.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        dealId: deal.id,
        ownerId: user.id,
        proposalNumber: `PROP-VIMAL-001`,
        title: 'Custom CRM & Cloud Platform Engineering Proposal',
        description: 'Comprehensive software delivery for Vimal Enterprises.',
        subtotal: 450000.0,
        discountAmount: 25000.0,
        taxAmount: 76500.0, // 18% GST on 425000
        totalAmount: 501500.0,
        currency: 'INR',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        sentAt: new Date(),
        notes: 'Includes 6 months warranty, cloud migration, and free team onboarding.',
        items: {
          create: [
            {
              description: 'Frontend Architecture & Responsive Dashboard',
              quantity: 1,
              unitPrice: 200000.0,
              amount: 200000.0,
              order: 1,
            },
            {
              description: 'PostgreSQL Backend API & Security Layer',
              quantity: 1,
              unitPrice: 250000.0,
              amount: 250000.0,
              order: 2,
            },
          ],
        },
      },
      include: { items: true },
    });
    console.log('✅ Proposal Generated with Line Items:');
    console.log({
      id: proposal.id,
      number: proposal.proposalNumber,
      subtotal: `₹${proposal.subtotal}`,
      totalAmount: `₹${proposal.totalAmount}`,
      itemsCount: proposal.items.length,
    });
  } else {
    console.log('Proposal already exists:', proposal.id, proposal.proposalNumber);
  }

  console.log('\n--- Step 6: Converting to Customer ---');
  let customer = await prisma.customer.findFirst({
    where: { phone: '1234567890', organizationId: org.id, deletedAt: null },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        dealId: deal.id,
        ownerId: user.id,
        companyName: 'Vimal Enterprises',
        contactName: 'Vimal',
        title: 'Founder & CEO',
        phone: '1234567890',
        email: 'vimal@enterprises.com',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        category: 'Full-Stack Software',
        purchasedServices: 'Custom CRM Platform Engineering',
        status: 'ACTIVE',
        notes: 'Priority VIP client account.',
      },
    });
    console.log('✅ Customer Account Created:');
    console.log({
      id: customer.id,
      company: customer.companyName,
      contact: customer.contactName,
      status: customer.status,
    });
  } else {
    console.log('Customer already exists:', customer.id, customer.companyName);
  }

  console.log('\n--- Step 7: Generating Official Tax In-Voice ---');
  let invoice = await prisma.invoice.findFirst({
    where: { clientPhone: '1234567890', organizationId: org.id, deletedAt: null },
  });

  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber: 'INV-2026-VIMAL-01',
        title: 'Project Initiation Invoice - Vimal Enterprises',
        clientName: 'Vimal',
        clientContact: 'Vimal',
        clientPhone: '1234567890',
        clientEmail: 'vimal@enterprises.com',
        clientAddress: 'Vimal Enterprises, Anna Nagar, Chennai, TN',
        leadId: lead.id,
        customerId: customer.id,
        dealId: deal.id,
        proposalId: proposal.id,
        creatorId: user.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'PAID',
        currency: '₹',
        subtotal: 200000.0,
        taxRate: 18.0,
        taxAmount: 36000.0,
        total: 236000.0,
        advanceAmount: 236000.0,
        amountPaid: 236000.0,
        balanceDue: 0.0,
        paymentMethod: 'UPI / Bank Transfer',
        paidAt: new Date(),
        notes: 'Thank you for choosing DigiTechzo! Project sprint starts on Monday.',
        items: {
          create: [
            {
              description: 'Initial Sprint Advance & License Milestone',
              subdesc: 'Sprint 1 kick-off milestone delivery',
              quantity: 1,
              price: 200000.0,
              advanceAmount: 200000.0,
              order: 1,
            },
          ],
        },
      },
      include: { items: true },
    });
    console.log('✅ In-Voice Created & Marked Paid:');
    console.log({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: `₹${invoice.total}`,
      status: invoice.status,
      balanceDue: `₹${invoice.balanceDue}`,
    });
  } else {
    console.log('Invoice already exists:', invoice.id, invoice.invoiceNumber);
  }

  console.log('\n=============================================');
  console.log('🎉 COMPLETE END-TO-END FLOW EXECUTED FOR VIMAL!');
  console.log('=============================================');
}

main()
  .catch((e) => {
    console.error('Error executing flow:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
