// Serializers — the exact JSON shapes from API_CONTRACT.md.
// NEVER include passwordHash (or any token) in a user object.

const STATUS_LABELS = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

function toUserJson(u) {
  if (!u) return null;
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone || null,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  };
}

function toProgramJson(p) {
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    shortDescription: p.shortDescription,
    description: p.description,
    imageUrl: p.imageUrl || null,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function toApplicationJson(a) {
  if (!a) return null;
  return {
    id: a.id,
    trackingCode: a.trackingCode,
    userId: a.userId,
    programId: a.programId,
    programTitle: a.program ? a.program.title : undefined,
    programSlug: a.program ? a.program.slug : undefined,
    applicantFirstName: a.applicantFirstName,
    applicantLastName: a.applicantLastName,
    applicantEmail: a.applicantEmail,
    applicantPhone: a.applicantPhone || null,
    details: a.details,
    status: a.status,
    statusLabel: STATUS_LABELS[a.status] || a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function toMessageJson(m) {
  if (!m) return null;
  const sender = m.sender;
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown',
    senderRole: sender ? sender.role : null,
    recipientId: m.recipientId || null,
    applicationId: m.applicationId || null,
    subject: m.subject,
    body: m.body,
    isRead: m.isRead,
    createdAt: m.createdAt,
  };
}

function toNotificationJson(n) {
  if (!n) return null;
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link || null,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

function toDonationJson(d) {
  if (!d) return null;
  return {
    id: d.id,
    amount: d.amountCents / 100,
    amountCents: d.amountCents,
    currency: d.currency,
    status: d.status,
    donorName: d.donorName || null,
    donorEmail: d.donorEmail || null,
    message: d.message || null,
    createdAt: d.createdAt,
  };
}

function toContactMessageJson(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone || null,
    subject: c.subject,
    message: c.message,
    isRead: c.isRead,
    createdAt: c.createdAt,
  };
}

module.exports = {
  STATUS_LABELS,
  toUserJson,
  toProgramJson,
  toApplicationJson,
  toMessageJson,
  toNotificationJson,
  toDonationJson,
  toContactMessageJson,
};
