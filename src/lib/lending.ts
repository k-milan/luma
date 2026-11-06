export type Frequency = "Daily" | "Weekly" | "Monthly";
export type Customer = { id: string; name: string; phone: string; address: string; business: string; email: string; createdAt: string };
export type Rate = { id: string; name: string; percent: number; active: boolean };
export type PaymentType = { id: string; name: string; active: boolean };
export type Loan = { id: string; customerId: string; principal: number; rateId: string; ratePercent: number; installments: number; frequency: Frequency; createdAt: string; status: "Approved" | "Released"; releasedAt?: string; releaseMethod?: string };
export type Payment = { id: string; loanId: string; installment: number; amount: number; date: string; typeId: string; reference: string };
export type Store = { version: 1; customers: Customer[]; loans: Loan[]; payments: Payment[]; rates: Rate[]; paymentTypes: PaymentType[] };
export type Scheduled = { id: string; loan: Loan; customer: Customer; number: number; date: string; due: number; received: number; remaining: number; status: "Paid" | "Partial" | "Overdue" | "Pending" };

export const money = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2, minimumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
export const round = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
export const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const formatDate = (date: string, long = false) => new Date(date + "T12:00:00Z").toLocaleDateString("en-PH", { month: long ? "long" : "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function dueDate(release: string, frequency: Frequency, index: number) {
  if (frequency !== "Monthly") return shiftDate(release, index * (frequency === "Weekly" ? 7 : 1));
  const d = new Date(release + "T12:00:00Z");
  const originalDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + index);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay, last));
  return d.toISOString().slice(0, 10);
}
export function terms(principal: number, percent: number, count: number) {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(percent) || percent < 0 || !Number.isInteger(count) || count < 1 || count > 365) throw new Error("Enter a positive principal, valid interest rate, and 1–365 installments.");
  const interest = round(principal * percent / 100);
  const total = round(principal + interest);
  const cents = Math.round(total * 100);
  const regularCents = Math.floor(cents / count);
  return { interest, total, installment: regularCents / 100, lastInstallment: (cents - regularCents * (count - 1)) / 100 };
}
export function schedule(store: Store, today = todayISO()): Scheduled[] {
  return store.loans.filter(l => l.status === "Released" && l.releasedAt).flatMap(loan => {
    const customer = store.customers.find(c => c.id === loan.customerId);
    if (!customer) return [];
    const t = terms(loan.principal, loan.ratePercent, loan.installments);
    return Array.from({ length: loan.installments }, (_, i) => {
      const number = i + 1;
      const date = dueDate(loan.releasedAt!, loan.frequency, number);
      const due = number === loan.installments ? t.lastInstallment : t.installment;
      const received = round(store.payments.filter(p => p.loanId === loan.id && p.installment === number).reduce((s, p) => s + p.amount, 0));
      const remaining = Math.max(0, round(due - received));
      const status: Scheduled["status"] = remaining === 0 ? "Paid" : received > 0 ? "Partial" : date < today ? "Overdue" : "Pending";
      return { id: `${loan.id}-${number}`, loan, customer, number, date, due, received, remaining, status };
    });
  }).sort((a, b) => a.date.localeCompare(b.date) || a.customer.name.localeCompare(b.customer.name));
}
export function recordPayment(store: Store, entry: Scheduled, amount: number, typeId: string, date: string, reference: string): Store {
  const current = schedule(store).find(s => s.id === entry.id);
  if (!current || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) > Math.round(current.remaining * 100)) throw new Error("Payment must be greater than zero and no more than the remaining installment.");
  if (!store.paymentTypes.some(t => t.id === typeId && t.active)) throw new Error("Choose an active payment type.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayISO() || date < current.loan.releasedAt!) throw new Error("Payment date must be between release date and today.");
  return { ...store, payments: [...store.payments, { id: crypto.randomUUID(), loanId: current.loan.id, installment: current.number, amount: round(amount), date, typeId, reference: reference.trim() }] };
}
export function releaseLoan(store: Store, id: string, date: string, method: string): Store {
  const loan = store.loans.find(l => l.id === id);
  if (!loan || loan.status !== "Approved") throw new Error("This loan is not awaiting release.");
  if (!date || date > todayISO() || date < loan.createdAt) throw new Error("Release date must be between approval date and today.");
  if (!store.paymentTypes.some(t => t.id === method && t.active)) throw new Error("Choose an active release method.");
  return { ...store, loans: store.loans.map(l => l.id === id ? { ...l, status: "Released", releasedAt: date, releaseMethod: method } : l) };
}
export function createDemo(today = todayISO()): Store {
  const names = ["Mariana Santos", "Daniel Reyes", "Isabella Cruz", "Rafael Garcia", "Sofia Mendoza", "Gabriel Flores", "Camila Torres", "Mateo Villanueva", "Andrea Ramos", "Lucas Navarro", "Elena Bautista", "Miguel Castillo"];
  const businesses = ["Sari-sari store", "Motorcycle repair", "Food stall", "Retail shop", "Online selling", "Produce vendor"];
  const customers = names.map((name, i) => ({ id: `C-${1001 + i}`, name, phone: `09${String(170000000 + i * 317).padStart(9, "0")}`, address: ["San Isidro", "Mabini", "Poblacion", "San Roque"][i % 4] + ", Quezon City", business: businesses[i % 6], email: name.toLowerCase().split(" ")[0] + "@example.com", createdAt: shiftDate(today, -90 + i) }));
  const rates = [{ id: "R-1", name: "Standard", percent: 10, active: true }, { id: "R-2", name: "Preferred", percent: 8, active: true }, { id: "R-3", name: "Short term", percent: 6, active: true }];
  const paymentTypes = [{ id: "PT-1", name: "Cash", active: true }, { id: "PT-2", name: "Bank transfer", active: true }, { id: "PT-3", name: "GCash", active: true }];
  const loans: Loan[] = customers.slice(0, 11).map((c, i) => ({ id: `LN-${1028 + i}`, customerId: c.id, principal: [24000, 18000, 15000, 21000, 15000, 15000, 30000, 25000, 20000, 35000, 20000][i], rateId: "R-1", ratePercent: 10, installments: 12, frequency: "Weekly", createdAt: shiftDate(today, i < 8 ? -35 : -2), status: i < 8 ? "Released" : "Approved", ...(i < 8 ? { releasedAt: shiftDate(today, i < 6 ? -28 : -3 + (i - 6) * 2), releaseMethod: "PT-2" } : {}) }));
  const store: Store = { version: 1, customers, loans, payments: [], rates, paymentTypes };
  schedule(store, today).forEach((s, i) => {
    if (s.date < today && (i % 11 !== 1)) store.payments.push({ id: `P-${i}`, loanId: s.loan.id, installment: s.number, amount: s.due, date: s.date, typeId: paymentTypes[i % 3].id, reference: `DEMO-${1000 + i}` });
    if (s.date === today && [0, 2, 3, 5].includes(customers.findIndex(c => c.id === s.customer.id))) {
      const partial = s.customer.id === customers[3].id || s.customer.id === customers[5].id;
      store.payments.push({ id: `P-${i}`, loanId: s.loan.id, installment: s.number, amount: partial ? round(s.due / 2) : s.due, date: today, typeId: "PT-1", reference: `DEMO-${1000 + i}` });
    }
  });
  return store;
}

export function isStore(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const s = value as Store;
  return s.version === 1 && Array.isArray(s.customers) && s.customers.every(c => typeof c.id === "string" && typeof c.name === "string" && typeof c.phone === "string" && typeof c.address === "string" && typeof c.business === "string" && typeof c.email === "string" && typeof c.createdAt === "string") && Array.isArray(s.rates) && s.rates.every(r => typeof r.id === "string" && typeof r.name === "string" && Number.isFinite(r.percent) && r.percent >= 0 && typeof r.active === "boolean") && Array.isArray(s.paymentTypes) && s.paymentTypes.every(t => typeof t.id === "string" && typeof t.name === "string" && typeof t.active === "boolean") && Array.isArray(s.loans) && s.loans.every(l => s.customers.some(c => c.id === l.customerId) && typeof l.id === "string" && Number.isFinite(l.principal) && l.principal > 0 && Number.isFinite(l.ratePercent) && l.ratePercent >= 0 && Number.isInteger(l.installments) && l.installments > 0 && l.installments <= 365 && ["Daily", "Weekly", "Monthly"].includes(l.frequency) && ["Approved", "Released"].includes(l.status) && (l.status !== "Released" || /^\d{4}-\d{2}-\d{2}$/.test(l.releasedAt || ""))) && Array.isArray(s.payments) && s.payments.every(p => typeof p.id === "string" && typeof p.date === "string" && Number.isFinite(p.amount) && p.amount > 0 && s.loans.some(l => l.id === p.loanId && p.installment >= 1 && p.installment <= l.installments));
}
