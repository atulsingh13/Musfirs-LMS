import { api } from "@/services/api";

export interface SearchLeadResult {
  _id: string;
  name: string;
  contact: string;
  email?: string;
  type: "Lead";
}

export interface SearchUserResult {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: "User";
}

export interface GlobalSearchResponse {
  success: boolean;
  data: {
    leads: SearchLeadResult[];
    users: SearchUserResult[];
  };
}

export async function searchGlobal(q: string): Promise<GlobalSearchResponse> {
  const { data } = await api.get<GlobalSearchResponse>("/search", {
    params: { q },
  });
  return data;
}
