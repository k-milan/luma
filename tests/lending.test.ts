import test from "node:test";
import assert from "node:assert/strict";
import { createDemo, dueDate, isStore, recordPayment, releaseLoan, round, schedule, terms, todayISO } from "../src/lib/lending.ts";

test("installments sum exactly to the total, including rounding", () => {
  const t = terms(1000, 8, 7);
  assert.equal(round(t.installment * 6 + t.lastInstallment), 1080);
  const store = createDemo();
  for (const loan of store.loans.filter(l => l.status === "Released")) {
    const rows = schedule(store).filter(s => s.loan.id === loan.id);
    assert.equal(round(rows.reduce((sum, row) => sum + row.due, 0)), terms(loan.principal, loan.ratePercent, loan.installments).total);
  }
});

test("monthly dates clamp to month end without drifting subsequent dues", () => {
  assert.equal(dueDate("2026-01-31", "Monthly", 1), "2026-02-28");
  assert.equal(dueDate("2026-01-31", "Monthly", 2), "2026-03-31");
  assert.equal(dueDate("2028-01-31", "Monthly", 1), "2028-02-29");
});

test("partial collection updates only the target installment and rejects overpayment", () => {
  const store = createDemo();
  const row = schedule(store).find(s => s.remaining > 100 && s.date === todayISO())!;
  const updated = recordPayment(store, row, 100, "PT-1", todayISO(), "TEST");
  const next = schedule(updated).find(s => s.id === row.id)!;
  assert.equal(next.remaining, round(row.remaining - 100));
  assert.equal(next.status, "Partial");
  assert.throws(() => recordPayment(updated, row, row.remaining, "PT-1", todayISO(), ""), /no more/);
  assert.throws(() => recordPayment(store, row, 0, "PT-1", todayISO(), ""), /greater/);
  const paid = recordPayment(updated, next, next.remaining, "PT-2", todayISO(), "");
  assert.equal(schedule(paid).find(s => s.id === row.id)?.status, "Paid");
});

test("releasing a loan generates the schedule and cannot be repeated", () => {
  const store = createDemo();
  const loan = store.loans.find(l => l.status === "Approved")!;
  assert.equal(schedule(store).filter(s => s.loan.id === loan.id).length, 0);
  const updated = releaseLoan(store, loan.id, todayISO(), "PT-1");
  const rows = schedule(updated).filter(s => s.loan.id === loan.id);
  assert.equal(rows.length, loan.installments);
  assert.equal(rows[0].date, dueDate(todayISO(), loan.frequency, 1));
  assert.throws(() => releaseLoan(updated, loan.id, todayISO(), "PT-1"), /not awaiting/);
});

test("demo data restores and rejects invalid loan values", () => {
  const store = createDemo();
  assert.ok(isStore(JSON.parse(JSON.stringify(store))));
  assert.equal(isStore({ ...store, version: 2 }), false);
  assert.equal(isStore({ ...store, loans: [{ ...store.loans[0], installments: 0 }] }), false);
  assert.throws(() => terms(1000, 10, 0));
  assert.throws(() => terms(-1, 10, 12));
});
