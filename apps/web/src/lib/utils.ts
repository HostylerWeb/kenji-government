import { clsx } from "clsx";

export function cn(...inputs: (string | undefined | false | null)[]) {
  return clsx(inputs);
}

export function formatKsh(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return `Ksh ${num.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return num.toLocaleString("en-KE");
}
