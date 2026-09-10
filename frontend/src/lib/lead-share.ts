import { toast } from "sonner";
import {
  downloadLeadQuotation,
  formatLeadDateLabel,
  getLeadErrorMessage,
  type ApiLead,
} from "@/services/lead-api";

function toWhatsAppPhone(contactNumber: string): string {
  let phone = contactNumber.replace(/[^0-9]/g, "");
  if (phone.length === 10) {
    phone = `91${phone}`;
  }
  return phone;
}

export function sendWhatsAppMessage(lead: Pick<
  ApiLead,
  "name" | "contactNumber" | "destination" | "dateOfTravel"
>): void {
  const contact = lead.contactNumber?.trim() ?? "";
  const phone = toWhatsAppPhone(contact);
  if (!phone) {
    toast.error("No contact number available for this lead.");
    return;
  }

  const travelLabel = lead.dateOfTravel
    ? formatLeadDateLabel(lead.dateOfTravel)
    : "your planned dates";

  const message = `Hi ${lead.name || "there"},

Greetings from Musafirs!

I am reaching out regarding your upcoming trip to *${lead.destination || "your destination"}* on ${travelLabel}. Let me know when is a good time to discuss your travel plan.`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

export async function downloadQuotation(
  leadId: string,
  leadName: string
): Promise<void> {
  const toastId = toast.loading("Generating quotation PDF…");
  try {
    const blob = await downloadLeadQuotation(leadId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Quotation_${(leadName || "Lead").replace(/\s+/g, "_")}.pdf`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Quotation downloaded", { id: toastId });
  } catch (error) {
    toast.error(getLeadErrorMessage(error, "Failed to generate PDF"), {
      id: toastId,
    });
  }
}

export default {
  sendWhatsAppMessage,
  downloadQuotation,
};
