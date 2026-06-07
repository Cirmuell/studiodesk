export type ClientTier = "standard" | "preferred" | "enterprise";
export type ProjectStatus = "lead" | "active" | "completed" | "archived";
export type DocType = "invoice" | "receipt" | "proposal" | "contract";
export type DocStatus = "draft" | "generating" | "ready" | "failed";

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  tier: ClientTier;
  initial: string;
  color: string;
}

export interface Project {
  id: string;
  title: string;
  clientId: string;
  status: ProjectStatus;
  budget: number;
  scope: string;
  updatedAt: string;
}

export interface Doc {
  id: string;
  type: DocType;
  status: DocStatus;
  number: string;
  clientId: string;
  projectId: string;
  total: number;
  updatedAt: string;
}

export interface PricingRun {
  id: string;
  projectId: string;
  recommendedTotal: number;
  rangeLow: number;
  rangeHigh: number;
  confidence: "low" | "medium" | "high";
  createdAt: string;
}

export const clients: Client[] = [
  { id: "c1", name: "Maya Chen", company: "Lumen & Loom", email: "maya@lumenloom.co", tier: "preferred", initial: "M", color: "oklch(0.78 0.12 35)" },
  { id: "c2", name: "Oren Park", company: "Northwind Coffee", email: "oren@northwind.coffee", tier: "standard", initial: "O", color: "oklch(0.78 0.1 150)" },
  { id: "c3", name: "Riya Patel", company: "Atlas Architects", email: "riya@atlas-arch.com", tier: "enterprise", initial: "R", color: "oklch(0.75 0.1 250)" },
  { id: "c4", name: "Jonah West", company: "Field Notes Mag", email: "jonah@fieldnotes.io", tier: "standard", initial: "J", color: "oklch(0.78 0.12 80)" },
];

export const projects: Project[] = [
  { id: "p1", title: "Brand identity refresh", clientId: "c1", status: "active", budget: 12000, scope: "Logo system, color & type, brand guidelines (40pp), social templates.", updatedAt: "2d ago" },
  { id: "p2", title: "Packaging photography", clientId: "c2", status: "lead", budget: 4800, scope: "Half-day studio shoot, 12 retouched hero shots, 20 lifestyle.", updatedAt: "5h ago" },
  { id: "p3", title: "Annual report design", clientId: "c3", status: "active", budget: 22000, scope: "60-page report, data viz, print-ready files, web one-pager.", updatedAt: "1d ago" },
  { id: "p4", title: "Editorial illustration", clientId: "c4", status: "completed", budget: 2400, scope: "3 spot illustrations for spring issue.", updatedAt: "2w ago" },
];

export const docs: Doc[] = [
  { id: "d1", type: "proposal", status: "ready", number: "PRO-0042", clientId: "c1", projectId: "p1", total: 12000, updatedAt: "2d ago" },
  { id: "d2", type: "invoice", status: "ready", number: "INV-0118", clientId: "c3", projectId: "p3", total: 11000, updatedAt: "1d ago" },
  { id: "d3", type: "proposal", status: "draft", number: "PRO-0043", clientId: "c2", projectId: "p2", total: 4800, updatedAt: "5h ago" },
  { id: "d4", type: "receipt", status: "ready", number: "REC-0091", clientId: "c4", projectId: "p4", total: 2400, updatedAt: "2w ago" },
  { id: "d5", type: "contract", status: "draft", number: "CON-0017", clientId: "c1", projectId: "p1", total: 12000, updatedAt: "3d ago" },
];

export const pricingRuns: PricingRun[] = [
  { id: "r1", projectId: "p2", recommendedTotal: 4800, rangeLow: 4200, rangeHigh: 5600, confidence: "high", createdAt: "5h ago" },
  { id: "r2", projectId: "p1", recommendedTotal: 12000, rangeLow: 10500, rangeHigh: 14000, confidence: "medium", createdAt: "3d ago" },
];

export const getClient = (id: string) => clients.find((c) => c.id === id);
export const getProject = (id: string) => projects.find((p) => p.id === id);

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
