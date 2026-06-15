// Typed client for the FastAPI JSON API. Dev hits /api via the Vite proxy;
// prod is same-origin. Always sends the session cookie.
import type {
  CaseStudy,
  McpToken,
  Opportunity,
  RagSource,
} from "../data/types";

export interface Stats {
  counts: { opportunity: number; case_study: number; document: number; document_chunk: number };
  ingestTrend: { label: string; value: number }[];
}
export interface AskResponse {
  answer: string;
  sources: RagSource[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json", ...init?.headers }
      : init?.headers,
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  // auth
  login: (username: string, password: string) =>
    req<{ user: string }>("/auth/login", json({ username, password })),
  me: () => req<{ user: string }>("/auth/me"),
  logout: () => req<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  // dashboard
  stats: () => req<Stats>("/stats"),

  // opportunities
  listOpportunities: () => req<Opportunity[]>("/opportunities"),
  getOpportunity: (id: number | string) => req<Opportunity>(`/opportunities/${id}`),
  createOpportunity: (body: Partial<Opportunity>) =>
    req<Opportunity>("/opportunities", json(body)),
  updateOpportunity: (id: number | string, body: Partial<Opportunity>) =>
    req<Opportunity>(`/opportunities/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteOpportunity: (id: number | string) =>
    req<void>(`/opportunities/${id}`, { method: "DELETE" }),

  // case studies
  listCaseStudies: () => req<CaseStudy[]>("/casestudies"),
  getCaseStudy: (id: number | string) => req<CaseStudy>(`/casestudies/${id}`),
  createCaseStudy: (body: Partial<CaseStudy>) => req<CaseStudy>("/casestudies", json(body)),
  updateCaseStudy: (id: number | string, body: Partial<CaseStudy>) =>
    req<CaseStudy>(`/casestudies/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCaseStudy: (id: number | string) =>
    req<void>(`/casestudies/${id}`, { method: "DELETE" }),

  // ask
  ask: (question: string) => req<AskResponse>("/ask", json({ question })),

  // tokens
  listTokens: () => req<McpToken[]>("/tokens"),
  createToken: (userName: string) => req<McpToken>("/tokens", json({ userName })),
  toggleToken: (id: number, active: boolean) =>
    req<{ id: number; active: boolean }>(`/tokens/${id}/toggle`, json({ active })),
  deleteToken: (id: number) => req<void>(`/tokens/${id}`, { method: "DELETE" }),

  // import (multipart)
  importOpportunity: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<Opportunity>("/import/opportunity", { method: "POST", body: fd });
  },
  importCaseStudy: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<CaseStudy>("/import/casestudy", { method: "POST", body: fd });
  },
};
