// app/api/list/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
// use RELATIVE import to avoid path-alias issues
import { loadAll } from '../../../lib/load';

export async function GET() {
  try {
    const datasets = await loadAll();
    // send only what the dropdown needs + the raw for immediate render
    return NextResponse.json({
      ok: true,
      datasets: datasets.map(d => ({ name: d.name, file: d.file, raw: d.raw })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 200 }
    );
  }
}
