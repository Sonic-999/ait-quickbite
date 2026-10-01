import fs from 'fs';

const report = JSON.parse(fs.readFileSync('./lighthouse-pwa-report.json', 'utf8'));

console.log('=== LIGHTHOUSE PWA AUDIT SUMMARY ===');
for (const [key, cat] of Object.entries(report.categories || {})) {
  console.log(`\nCategory: ${cat.title} - Score: ${cat.score !== null ? Math.round(cat.score * 100) + '%' : 'N/A'}`);
  if (cat.auditRefs) {
    for (const ref of cat.auditRefs) {
      const audit = report.audits[ref.id];
      if (audit) {
        const passed = audit.score === 1 || audit.score === null;
        const icon = passed ? '✅' : '❌';
        console.log(`  ${icon} [${ref.id}] ${audit.title}`);
        if (!passed) {
          if (audit.explanation) console.log(`     Explanation: ${audit.explanation}`);
          if (audit.description) console.log(`     Description: ${audit.description}`);
          if (audit.errorMessage) console.log(`     Error: ${audit.errorMessage}`);
        }
      }
    }
  }
}

console.log('\n=== DIRECT PWA AUDIT DETAILS ===');
const pwaAudits = [
  'installable-manifest',
  'service-worker',
  'splash-screen',
  'themed-omnibox',
  'maskable-icon',
  'content-width',
  'viewport',
  'apple-touch-icon',
  'pwa-cross-browser',
  'pwa-page-transitions',
  'pwa-each-page-has-url'
];

for (const id of pwaAudits) {
  const audit = report.audits[id];
  if (audit) {
    const passed = audit.score === 1 || audit.score === null;
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} [${id}] ${audit.title} -> Score: ${audit.score}`);
    if (audit.explanation) console.log(`   Explanation: ${audit.explanation}`);
  }
}
