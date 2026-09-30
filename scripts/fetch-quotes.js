#!/usr/bin/env node
// 보유 중(청산 안 된) 종목의 현재가 + QQQ 과거 종가를 받아 prices.json 에 쓴다.
// 무의존성, Node 18+ 전역 fetch. GitHub Actions 가 장 마감 후 + trades.json 이 바뀔 때 돈다.
// 야후 실패 시 이전 값을 그대로 둔다 — 페이지가 빈 값 대신 어제 값을 보여준다.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'prices.json');

const yahooSymbol = t => String(t).trim().toUpperCase().replace(/\./g, '-'); // BRK.B → BRK-B

async function fetchDaily(ticker, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(ticker))}?interval=1d&range=${range}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const r = j && j.chart && j.chart.result && j.chart.result[0];
    if (!r) throw new Error('no result');
    const ts = r.timestamp || [];
    const close = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
    const out = [];
    for (let i = 0; i < ts.length; i++) {
      const c = close[i];
      if (c == null || !isFinite(c)) continue; // 결측 봉은 버린다(마지막 봉이면 다음 날 다시 받으면 채워짐)
      const d = new Date(ts[i] * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD
      out.push({ d, c: Math.round(c * 10000) / 10000 });
    }
    // 야후는 마감 후 몇 시간 동안 그날 봉의 close 를 null 로 준다(2026-09-30 실측: OKTA 9/29 누락).
    // 장이 끝난 뒤(16:00 ET 이후)면 meta.regularMarketPrice 가 그날 종가다 → 그 값으로 채운다.
    const m = r.meta || {};
    if (isFinite(m.regularMarketPrice) && m.regularMarketTime) {
      const et = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
        .formatToParts(new Date(m.regularMarketTime * 1000)).reduce((a, x) => (a[x.type] = x.value, a), {});
      const d = `${et.year}-${et.month}-${et.day}`, hour = Number(et.hour) % 24;
      const last = out[out.length - 1];
      if (hour >= 16 && (!last || last.d < d)) out.push({ d, c: Math.round(m.regularMarketPrice * 10000) / 10000 });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(fn, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { err = e; await new Promise((r) => setTimeout(r, 1000 * (i + 1))); }
  }
  throw err;
}

async function main() {
  const tradesFile = path.join(ROOT, 'trades.json');
  const trades = fs.existsSync(tradesFile) ? JSON.parse(fs.readFileSync(tradesFile, 'utf8') || '[]') : [];
  const openTickers = [...new Set(trades.filter((t) => !t.exitDate || t.exitPrice == null).map((t) => String(t.ticker).toUpperCase()))];

  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { qqq: [], last: {} };

  let qqq = prev.qqq || [];
  try {
    qqq = await withRetry(() => fetchDaily('QQQ', '5y'));
    console.log(`QQQ ${qqq.length}봉`);
  } catch (e) {
    console.error('QQQ 실패, 이전 값 유지:', e.message);
  }

  const last = { ...(prev.last || {}) };
  for (const t of openTickers) {
    try {
      const series = await withRetry(() => fetchDaily(t, '5d'));
      if (series.length) last[t] = series[series.length - 1];
      console.log(t, last[t]);
    } catch (e) {
      console.error(t, '실패, 이전 값 유지:', e.message);
    }
    await new Promise((r) => setTimeout(r, 300)); // 야후 과호출 방지
  }
  for (const k of Object.keys(last)) if (!openTickers.includes(k)) delete last[k]; // 청산된 종목은 정리

  fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), qqq, last }, null, 1) + '\n');
  console.log(`prices.json 갱신 — QQQ ${qqq.length}봉, 보유 종목 ${Object.keys(last).length}개`);
}

main().catch((e) => { console.error(e); process.exit(1); });
