import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const harPath = "e:\\vyomantha\\Vyomanta\\localhost2.har";
    if (!fs.existsSync(harPath)) {
      return NextResponse.json({ error: "HAR file not found" });
    }

    const fileContent = fs.readFileSync(harPath, 'utf8');
    const data = JSON.parse(fileContent);
    const entries = data.log.entries;

    const requestSummary = {};
    const longRequests = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const req = entry.request;
      const url = new URL(req.url);
      const cleanUrl = url.origin + url.pathname;
      const method = req.method;
      const time = entry.time; // duration in ms

      const key = `${method} ${cleanUrl}`;
      if (!requestSummary[key]) {
        requestSummary[key] = { count: 0, totalDuration: 0, minDuration: Infinity, maxDuration: 0 };
      }
      requestSummary[key].count += 1;
      requestSummary[key].totalDuration += time;
      requestSummary[key].minDuration = Math.min(requestSummary[key].minDuration, time);
      requestSummary[key].maxDuration = Math.max(requestSummary[key].maxDuration, time);

      if (time > 200) {
        longRequests.push({
          url: req.url,
          method: method,
          duration: time,
          status: entry.response.status
        });
      }
    }

    // Format summary
    const summaryList = Object.entries(requestSummary).map(([key, val]) => ({
      request: key,
      count: val.count,
      avgDurationMs: Math.round(val.totalDuration / val.count),
      maxDurationMs: Math.round(val.maxDuration)
    })).sort((a, b) => b.count - a.count);

    longRequests.sort((a, b) => b.duration - a.duration);

    return NextResponse.json({
      totalRequests: entries.length,
      groupedRequests: summaryList,
      topLongRequests: longRequests.slice(0, 15)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message });
  }
}
