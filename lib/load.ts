// lib/load.ts
import fs from "fs";
import path from "path";

export async function loadAll() {
  const full = path.join(process.cwd(), "data", "data.json");
  const raw = fs.readFileSync(full, "utf-8");
  const json = JSON.parse(raw);
  return [
    {
      name: "data",
      file: "data.json",
      raw: json,
    },
  ];
}
