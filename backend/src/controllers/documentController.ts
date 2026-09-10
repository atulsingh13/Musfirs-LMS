import type { Request, Response } from "express";
import { findLeadForUser } from "./leadController.js";
import {
  generateQuotationPdf,
  sanitizeQuotationFilename,
} from "../services/quotationPdf.service.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function leadNameFromRecord(lead: {
  firstName?: string;
  lastName?: string;
}): string {
  return [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "Lead";
}

/** GET /api/leads/:id/quotation */
export const getLeadQuotation = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id ?? "");
    const lead = await findLeadForUser(id, req);

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateQuotationPdf(lead);
    } catch (error) {
      console.error(
        "[quotation] PDF generation failed:",
        error instanceof Error ? error.message : error
      );
      throw new AppError("Failed to generate quotation PDF", 500);
    }

    const safeName = sanitizeQuotationFilename(leadNameFromRecord(lead));
    const filename = `Quotation_${safeName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.send(pdfBuffer);
  }
);

export default { getLeadQuotation };
