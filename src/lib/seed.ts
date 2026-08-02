import type { Business } from "./types";

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function makeSeedBusinesses(): Business[] {
  return [
    {
      id: id("biz"),
      name: "Sunshine Day Care",
      icon: "🏠",
      color: "#7f56d9",
      unitLabel: "kid",
      unitCount: 12,
      income: [
        {
          id: id("ln"),
          name: "Tuition",
          category: "sales",
          amountCents: 80000,
          frequency: "monthly",
          kind: "perUnit",
        },
      ],
      expenses: [
        {
          id: id("ln"),
          name: "Mortgage",
          category: "rent",
          amountCents: 240000,
          frequency: "monthly",
          kind: "fixed",
        },
        {
          id: id("ln"),
          name: "Food",
          category: "food",
          amountCents: 15000,
          frequency: "monthly",
          kind: "perUnit",
        },
        {
          id: id("ln"),
          name: "Staff",
          category: "staff",
          amountCents: 320000,
          frequency: "monthly",
          kind: "fixed",
        },
        {
          id: id("ln"),
          name: "Insurance",
          category: "insurance",
          amountCents: 180000,
          frequency: "yearly",
          kind: "fixed",
        },
        {
          id: id("ln"),
          name: "Supplies",
          category: "supplies",
          amountCents: 2500,
          frequency: "monthly",
          kind: "perUnit",
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: id("biz"),
      name: "Kleen Sweep Cleaning Co",
      icon: "🧹",
      color: "#2e90fa",
      unitLabel: "client",
      unitCount: 8,
      income: [
        {
          id: id("ln"),
          name: "Service plan",
          category: "sales",
          amountCents: 32000,
          frequency: "monthly",
          kind: "perUnit",
        },
      ],
      expenses: [
        {
          id: id("ln"),
          name: "Van lease",
          category: "other",
          amountCents: 45000,
          frequency: "monthly",
          kind: "fixed",
        },
        {
          id: id("ln"),
          name: "Helper",
          category: "staff",
          amountCents: 190000,
          frequency: "monthly",
          kind: "fixed",
        },
        {
          id: id("ln"),
          name: "Insurance",
          category: "insurance",
          amountCents: 120000,
          frequency: "yearly",
          kind: "fixed",
        },
        {
          id: id("ln"),
          name: "Supplies",
          category: "supplies",
          amountCents: 4500,
          frequency: "monthly",
          kind: "perUnit",
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];
}

export const newId = id;
