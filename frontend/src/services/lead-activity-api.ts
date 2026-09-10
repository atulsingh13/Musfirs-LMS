import axios from "axios";
import { api } from "@/services/api";
import { getLeadErrorMessage } from "@/services/lead-api";

export type LeadActivityType =
  | "Status_Changed"
  | "Note_Added"
  | "Call_Scheduled"
  | "Call_Completed"
  | "Assigned"
  | "Lead_Created";

export interface LeadActivityActor {
  _id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

export interface LeadActivity {
  id: string;
  _id: string;
  leadId: string;
  actionType: LeadActivityType;
  details: string;
  createdAt?: string;
  performedBy?: LeadActivityActor | null;
}

interface LeadActivitiesResponse {
  success: boolean;
  data: { activities: LeadActivity[] };
}

interface AddLeadNoteResponse {
  success: boolean;
  message: string;
  data: { activity: LeadActivity };
}

export async function fetchLeadActivities(
  leadId: string
): Promise<LeadActivity[]> {
  try {
    const { data } = await api.get<LeadActivitiesResponse>(
      `/leads/${leadId}/activities`
    );
    return data.data?.activities ?? [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(getLeadErrorMessage(error, "Failed to load activities"));
    }
    throw error;
  }
}

export async function addLeadNote(
  leadId: string,
  note: string
): Promise<LeadActivity> {
  try {
    const { data } = await api.post<AddLeadNoteResponse>(
      `/leads/${leadId}/notes`,
      { note }
    );
    return data.data.activity;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(getLeadErrorMessage(error, "Failed to add note"));
    }
    throw error;
  }
}

export { getLeadErrorMessage };
