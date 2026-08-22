/**
 * Live-network check of the BYOK catalog + validation helpers.
 * OpenRouter's /models endpoint is public — no key required for the catalog.
 * Run: npx tsx --env-file-if-exists=.env.local scripts/test-byok.ts
 */
import { fetchCatalog, validateKey } from '../src/lib/byok'

async function main() {
  console.log('▶ Fetching the live OpenRouter catalog (public endpoint)…')
  const cat = await fetchCatalog('openrouter', '', null)
  console.log(`  total: ${cat.total} | free: ${cat.free} | error: ${cat.error ?? 'none'}`)
  console.log(`  first 5: ${cat.models.slice(0, 5).map((m) => m.id).join(', ')}`)

  let failures = 0
  if (cat.total < 50) {
    console.error('  ❌ expected a large catalog')
    failures++
  } else console.log('  ✅ catalog size sane')

  const firstPaid = cat.models.findIndex((m) => !m.free)
  if (cat.free > 0 && firstPaid !== cat.free) {
    console.error('  ❌ free models are not sorted first')
    failures++
  } else console.log('  ✅ free models sorted first')

  const geminiFree = cat.models.filter((m) => m.free)
  if (geminiFree.length === 0) {
    console.error('  ❌ expected at least one free entry')
    failures++
  } else console.log(`  ✅ ${geminiFree.length} free models present at top (vendors rotate — exact IDs not asserted)`)

  console.log('\n▶ Validating a deliberately invalid key…')
  const bad = await validateKey('openrouter', 'sk-or-v1-invalid-key-000', null)
  if (bad.ok || !/invalid|unauthorized/i.test(bad.error ?? '')) {
    console.error(`  ❌ expected auth failure, got: ${JSON.stringify(bad)}`)
    failures++
  } else console.log(`  ✅ invalid key correctly rejected: "${bad.error}" (${bad.latencyMs}ms)`)

  console.log('\n▶ Custom endpoint with bogus base URL…')
  const badCustom = await validateKey('custom', 'sk-test', 'https://localhost:9/nope')
  if (badCustom.ok) {
    console.error('  ❌ expected failure for unreachable base URL')
    failures++
  } else console.log(`  ✅ custom endpoint failed cleanly: "${badCustom.error}"`)

  console.log(failures === 0 ? '\n🎉 byok tests: all green' : `\n💥 ${failures} failure(s)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()
