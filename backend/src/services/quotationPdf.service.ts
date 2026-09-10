import puppeteer from "puppeteer";
import type { ILead } from "../models/Lead.js";

export type QuotationLead = Pick<
  ILead,
  | "firstName"
  | "lastName"
  | "contactNumber"
  | "email"
  | "destination"
  | "dateOfTravel"
  | "pax"
  | "totalAmount"
  | "advancePaid"
>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function leadDisplayName(lead: QuotationLead): string {
  const name = [lead.firstName, lead.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Guest";
}

function formatTravelDate(value?: Date | null): string {
  if (!value) return "To be confirmed";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "To be confirmed";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function sanitizeQuotationFilename(name: string): string {
  const safe = name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return safe || "Lead";
}

export function buildQuotationHtml(lead: QuotationLead): string {
  const clientName = escapeHtml(leadDisplayName(lead));
  const contact = escapeHtml(lead.contactNumber?.trim() || "—");
  const email = escapeHtml(lead.email?.trim() || "—");
  const destination = escapeHtml(lead.destination?.trim() || "—");
  const travelDate = escapeHtml(formatTravelDate(lead.dateOfTravel));
  const pax = String(lead.pax ?? 1);
  const totalAmount = Number(lead.totalAmount ?? 0);
  const advancePaid = Number(lead.advancePaid ?? 0);
  const balance = Math.max(0, totalAmount - advancePaid);

  const totalPricingHtml =
    totalAmount > 0
      ? `
        <tr><td>Package total</td><td class="amount">${escapeHtml(formatCurrency(totalAmount))}</td></tr>
        <tr><td>Advance paid</td><td class="amount">${escapeHtml(formatCurrency(advancePaid))}</td></tr>
        <tr class="total-row"><td>Balance due</td><td class="amount">${escapeHtml(formatCurrency(balance))}</td></tr>
      `
      : `<tr><td colspan="2" class="placeholder">Pricing to be confirmed after itinerary finalization.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Musafirs Quotation — ${clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 40px;
      font-size: 13px;
      line-height: 1.5;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0c4a6e 0%, #134e4a 100%);
      color: #ffffff;
      padding: 32px 36px;
    }
    .brand {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 6px;
    }
    .title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin-top: 8px;
      font-size: 13px;
      opacity: 0.9;
    }
    .body { padding: 32px 36px 40px; }
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
    }
    .field label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 2px;
    }
    .field span { font-size: 14px; font-weight: 600; color: #1e293b; }
    .list {
      list-style: none;
      padding: 0;
    }
    .list li {
      padding: 8px 0 8px 18px;
      position: relative;
      border-bottom: 1px solid #f1f5f9;
      color: #475569;
    }
    .list li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #0d9488;
      font-weight: bold;
    }
    .list.exclusions li:before { color: #dc2626; }
    table.pricing {
      width: 100%;
      border-collapse: collapse;
    }
    table.pricing td {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    table.pricing td.amount {
      text-align: right;
      font-weight: 600;
    }
    table.pricing tr.total-row td {
      font-size: 15px;
      font-weight: 700;
      color: #0c4a6e;
      border-bottom: none;
      padding-top: 14px;
    }
    .placeholder {
      color: #94a3b8;
      font-style: italic;
      padding: 12px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">Musafirs</div>
      <h1 class="title">Travel Itinerary &amp; Quotation</h1>
      <p class="subtitle">Prepared for ${clientName}</p>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">Client Details</div>
        <div class="grid">
          <div class="field"><label>Name</label><span>${clientName}</span></div>
          <div class="field"><label>Contact</label><span>${contact}</span></div>
          <div class="field"><label>Email</label><span>${email}</span></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Travel Details</div>
        <div class="grid">
          <div class="field"><label>Destination</label><span>${destination}</span></div>
          <div class="field"><label>Date of Travel</label><span>${travelDate}</span></div>
          <div class="field"><label>Passengers (Pax)</label><span>${pax}</span></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Inclusions</div>
        <ul class="list">
          <li>Return flights / transfers as per confirmed itinerary</li>
          <li>Accommodation on twin-sharing basis</li>
          <li>Daily breakfast (unless otherwise specified)</li>
          <li>Sightseeing and activities as per package</li>
          <li>All applicable taxes at time of booking</li>
        </ul>
      </div>
      <div class="section">
        <div class="section-title">Exclusions</div>
        <ul class="list exclusions">
          <li>Personal expenses, meals not mentioned, and tips</li>
          <li>Travel insurance and visa fees</li>
          <li>Any item not explicitly listed under inclusions</li>
        </ul>
      </div>
      <div class="section">
        <div class="section-title">Total Pricing</div>
        <table class="pricing">
          ${totalPricingHtml}
        </table>
      </div>
      <div class="footer">
        This quotation is valid for 7 days from the date of issue. Musafirs — Crafting memorable journeys.
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateQuotationPdf(lead: QuotationLead): Promise<Buffer> {
  const html = buildQuotationHtml(lead);
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export default {
  buildQuotationHtml,
  generateQuotationPdf,
  sanitizeQuotationFilename,
};
