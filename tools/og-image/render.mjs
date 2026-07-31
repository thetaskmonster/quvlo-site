const m = await import('/opt/node22/lib/node_modules/playwright/index.js');
const pw = m.default ?? m;
const b = await pw.chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=swiftshader','--no-sandbox','--no-proxy-server','--force-color-profile=srgb','--font-render-hinting=none']});
const url = new URL('./card.html', import.meta.url).href;
for (const [name, scale] of [['og-1x.png',1],['og-2x.png',2]]) {
  const p = await b.newPage({viewport:{width:1200,height:630}, deviceScaleFactor:scale});
  await p.goto(url,{waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({path:name}); await p.close();
}
const p = await b.newPage({viewport:{width:1200,height:630}, deviceScaleFactor:1});
await p.goto(url,{waitUntil:'networkidle'}); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({path:'og-q92.jpg', type:'jpeg', quality:92});
await p.screenshot({path:'og-q85.jpg', type:'jpeg', quality:85});
await b.close();
