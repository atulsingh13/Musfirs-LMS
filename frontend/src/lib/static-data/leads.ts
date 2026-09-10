import type {
  ApiLead,
  GetLeadsParams,
  LeadSource,
  LeadStats,
  LeadStatus,
} from "@/services/lead-api";

/** Seed travel leads for the Leads tab (UI-only until backend is connected). */
export const MOCK_LEADS: ApiLead[] = [
  {
    _id: "lead_001",
    name: "Ananya Sharma",
    age: 29,
    gender: "Female",
    destination: "Bali, Indonesia",
    numberOfPax: 2,
    contactNumber: "+91 98765 43210",
    dateOfTravel: "2026-09-15",
    email: "ananya.sharma@email.com",
    city: "Mumbai",
    leadSource: "Instagram",
    source: "Instagram",
    campaign: "Bali Escape Reel Aug",
    status: "Qualified",
    nextFollowUp: "2026-08-28",
    createdAt: "2026-08-02T09:00:00.000Z",
    updatedAt: "2026-08-20T11:00:00.000Z",
  },
  {
    _id: "lead_002",
    name: "Rohit Mehta",
    age: 34,
    gender: "Male",
    destination: "Manali, India",
    numberOfPax: 4,
    contactNumber: "+91 98200 11223",
    dateOfTravel: "2026-10-02",
    email: "rohit.mehta@email.com",
    city: "Ahmedabad",
    leadSource: "Facebook",
    source: "Facebook",
    campaign: "Himalayan Getaway Ads",
    status: "Plan Shared",
    nextFollowUp: "2026-08-27",
    createdAt: "2026-08-05T10:15:00.000Z",
    updatedAt: "2026-08-18T14:20:00.000Z",
  },
  {
    _id: "lead_003",
    name: "Priya Nair",
    age: 27,
    gender: "Female",
    destination: "Dubai, UAE",
    numberOfPax: 3,
    contactNumber: "+91 99887 66554",
    dateOfTravel: "2026-11-10",
    email: "priya.nair@email.com",
    city: "Bangalore",
    leadSource: "Website",
    source: "Website",
    campaign: "Diwali Dubai Landing",
    status: "Hot / Payment Pending",
    nextFollowUp: null,
    createdAt: "2026-08-08T08:40:00.000Z",
    updatedAt: "2026-08-22T16:00:00.000Z",
  },
  {
    _id: "lead_004",
    name: "Vikram Singh",
    age: 41,
    gender: "Male",
    destination: "Kerala Backwaters",
    numberOfPax: 5,
    contactNumber: "+91 97654 32109",
    dateOfTravel: "2026-09-28",
    email: "vikram.singh@email.com",
    city: "Delhi",
    leadSource: "Referral",
    source: "Referral",
    campaign: "Partner Referral — Travel Co",
    status: "Qualification Pending",
    nextFollowUp: "2026-08-29",
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-15T09:30:00.000Z",
  },
  {
    _id: "lead_005",
    name: "Neha Kapoor",
    age: 31,
    gender: "Female",
    destination: "Singapore",
    numberOfPax: 2,
    contactNumber: "+91 98111 22334",
    dateOfTravel: "2026-12-05",
    email: "neha.kapoor@email.com",
    city: "Pune",
    leadSource: "Google",
    source: "Google",
    campaign: "SEA City Breaks Search",
    status: "New Lead",
    nextFollowUp: "2026-08-26",
    createdAt: "2026-08-12T07:55:00.000Z",
    updatedAt: "2026-08-12T07:55:00.000Z",
  },
  {
    _id: "lead_006",
    name: "Arjun Patel",
    age: 36,
    gender: "Male",
    destination: "Goa",
    numberOfPax: 6,
    contactNumber: "+91 99001 12233",
    dateOfTravel: "2026-09-05",
    email: "arjun.patel@email.com",
    city: "Surat",
    leadSource: "WhatsApp",
    source: "WhatsApp",
    campaign: "Monsoon Goa Blast",
    status: "Booked",
    nextFollowUp: null,
    createdAt: "2026-07-20T11:10:00.000Z",
    updatedAt: "2026-08-01T18:00:00.000Z",
  },
  {
    _id: "lead_007",
    name: "Sneha Reddy",
    age: 25,
    gender: "Female",
    destination: "Leh Ladakh",
    numberOfPax: 2,
    contactNumber: "+91 98770 44556",
    dateOfTravel: "2026-08-30",
    email: "sneha.reddy@email.com",
    city: "Hyderabad",
    leadSource: "Instagram",
    source: "Instagram",
    campaign: "Adventure Stories Jul",
    status: "Not Interested",
    nextFollowUp: null,
    createdAt: "2026-07-28T13:25:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
  },
  {
    _id: "lead_008",
    name: "Karan Malhotra",
    age: 38,
    gender: "Male",
    destination: "Thailand",
    numberOfPax: 4,
    contactNumber: "+91 91234 56789",
    dateOfTravel: "2026-10-18",
    email: "karan.malhotra@email.com",
    city: "Chandigarh",
    leadSource: "Facebook",
    source: "Facebook",
    campaign: "Phuket Family Offer",
    status: "New Lead",
    nextFollowUp: "2026-08-30",
    createdAt: "2026-08-15T09:05:00.000Z",
    updatedAt: "2026-08-15T09:05:00.000Z",
  },
  {
    _id: "lead_009",
    name: "Meera Joshi",
    age: 33,
    gender: "Female",
    destination: "Maldives",
    numberOfPax: 2,
    contactNumber: "+91 99800 77665",
    dateOfTravel: "2026-11-22",
    email: "meera.joshi@email.com",
    city: "Jaipur",
    leadSource: "Website",
    source: "Website",
    campaign: "Honeymoon Special Form",
    status: "Advance Paid",
    nextFollowUp: "2026-08-27",
    createdAt: "2026-08-18T15:40:00.000Z",
    updatedAt: "2026-08-21T12:10:00.000Z",
  },
  {
    _id: "lead_010",
    name: "Aditya Rao",
    age: 28,
    gender: "Male",
    destination: "Rishikesh",
    numberOfPax: 8,
    contactNumber: "+91 97600 33445",
    dateOfTravel: "2026-09-12",
    email: "aditya.rao@email.com",
    city: "Noida",
    leadSource: "Referral",
    source: "Referral",
    campaign: "Corporate Offsite Intro",
    status: "Follow-up Later",
    nextFollowUp: "2026-09-02",
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-23T08:45:00.000Z",
  },
  {
    _id: "lead_011",
    name: "Divya Iyer",
    age: 30,
    gender: "Female",
    destination: "Europe (Paris + Rome)",
    numberOfPax: 2,
    contactNumber: "+91 98123 00987",
    dateOfTravel: "2027-04-10",
    email: "divya.iyer@email.com",
    city: "Chennai",
    leadSource: "Google",
    source: "Google",
    campaign: "Europe Spring Search",
    status: "Plan Shared",
    nextFollowUp: "2026-08-29",
    createdAt: "2026-08-22T06:30:00.000Z",
    updatedAt: "2026-08-24T17:15:00.000Z",
  },
  {
    _id: "lead_012",
    name: "Sahil Khan",
    age: 45,
    gender: "Male",
    destination: "Kashmir",
    numberOfPax: 3,
    contactNumber: "+91 97000 55667",
    dateOfTravel: "2026-10-08",
    email: "sahil.khan@email.com",
    city: "Lucknow",
    leadSource: "Other",
    source: "Other",
    campaign: "Walk-in Enquiry Desk",
    status: "Not Qualified",
    nextFollowUp: "2026-09-01",
    createdAt: "2026-08-24T11:20:00.000Z",
    updatedAt: "2026-08-24T11:20:00.000Z",
  },
];

function getSource(lead: ApiLead): LeadSource {
  return (lead.source || lead.leadSource) as LeadSource;
}

function inDateRange(
  dateValue: string,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true;
  const t = new Date(dateValue).getTime();
  if (Number.isNaN(t)) return true;
  if (startDate && t < new Date(startDate).getTime()) return false;
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

export function computeLeadStats(leads: ApiLead[]): LeadStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return {
    totalLeads: leads.length,
    newLeadsThisMonth: leads.filter((l) => {
      const created = l.createdAt ? new Date(l.createdAt).getTime() : 0;
      return created >= monthStart && l.status === "New Lead";
    }).length,
    inProgress: leads.filter((l) =>
      [
        "Qualification Pending",
        "Qualified",
        "Plan Shared",
        "Hot / Payment Pending",
        "Advance Paid",
        "Follow-up Later",
      ].includes(l.status)
    ).length,
    dealWon: leads.filter((l) =>
      ["Booked", "Travel Completed"].includes(l.status)
    ).length,
    lostLeads: leads.filter((l) =>
      ["Not Interested", "Not Qualified"].includes(l.status)
    ).length,
  };
}

export function queryMockLeads(params: GetLeadsParams = {}): {
  leads: ApiLead[];
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
  stats: LeadStats;
} {
  const search = params.search?.trim().toLowerCase() ?? "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 10);

  let filtered = MOCK_LEADS.filter((lead) => {
    const haystack = [
      lead.name,
      lead.destination,
      lead.contactNumber,
      lead.email,
      lead.city,
      lead.campaign,
      getSource(lead),
      lead.status,
      lead.gender,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const searchOk = !search || haystack.includes(search);
    const statusOk =
      !params.status ||
      params.status === "all" ||
      lead.status === (params.status as LeadStatus);
    const sourceOk =
      !params.source ||
      params.source === "all" ||
      getSource(lead) === (params.source as LeadSource);
    const dateOk = inDateRange(
      lead.dateOfTravel,
      params.startDate,
      params.endDate
    );

    const destinationQuery = params.destination?.trim().toLowerCase() ?? "";
    const destinationOk =
      !destinationQuery ||
      lead.destination.toLowerCase().includes(destinationQuery);

    const paxFilter = params.numberOfPax?.trim() ?? "";
    let paxOk = true;
    if (paxFilter && paxFilter !== "all") {
      if (paxFilter === "6+") {
        paxOk = lead.numberOfPax >= 6;
      } else {
        paxOk = lead.numberOfPax === Number(paxFilter);
      }
    }

    let followUpOk = true;
    if (params.followUpsDueToday) {
      if (!lead.nextFollowUp) {
        followUpOk = false;
      } else {
        const followUp = new Date(lead.nextFollowUp);
        const now = new Date();
        followUpOk =
          !Number.isNaN(followUp.getTime()) &&
          followUp.getFullYear() === now.getFullYear() &&
          followUp.getMonth() === now.getMonth() &&
          followUp.getDate() === now.getDate();
      }
    }

    return (
      searchOk &&
      statusOk &&
      sourceOk &&
      dateOk &&
      destinationOk &&
      paxOk &&
      followUpOk
    );
  });

  filtered = [...filtered].sort(
    (a, b) =>
      new Date(b.createdAt ?? b.dateOfTravel).getTime() -
      new Date(a.createdAt ?? a.dateOfTravel).getTime()
  );

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * limit;
  const leads = filtered.slice(start, start + limit);

  return {
    leads,
    total,
    pages,
    currentPage,
    limit,
    stats: computeLeadStats(MOCK_LEADS),
  };
}

export function getMockLeadById(id: string): ApiLead | null {
  return MOCK_LEADS.find((l) => l._id === id) ?? null;
}

export function upsertMockLead(lead: ApiLead, isNew: boolean) {
  if (isNew) {
    MOCK_LEADS.unshift(lead);
    return lead;
  }
  const idx = MOCK_LEADS.findIndex((l) => l._id === lead._id);
  if (idx >= 0) {
    MOCK_LEADS[idx] = lead;
    return MOCK_LEADS[idx];
  }
  MOCK_LEADS.unshift(lead);
  return lead;
}
