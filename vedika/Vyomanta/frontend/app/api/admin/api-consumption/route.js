import { NextResponse } from 'next/server';
import { getApiConsumptionStats } from '@/lib/memory';

export async function GET() {
  try {
    const stats = await getApiConsumptionStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
