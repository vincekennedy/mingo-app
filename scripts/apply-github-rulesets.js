#!/usr/bin/env node
/**
 * Overlay required status checks onto existing GitHub rulesets (by name).
 * Usage: node scripts/apply-github-rulesets.js
 * Needs `gh` auth with repo Administration.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = 'vincekennedy/mingo-app'

function ghJson(args, input) {
  const opts = { encoding: 'utf8' }
  if (input !== undefined) opts.input = input
  return JSON.parse(execFileSync('gh', args, opts))
}

function overlay(ruleset, spec) {
  const rules = ruleset.rules.map((rule) => {
    if (rule.type !== 'required_status_checks') return rule
    return {
      type: 'required_status_checks',
      parameters: {
        ...rule.parameters,
        strict_required_status_checks_policy:
          spec.strict_required_status_checks_policy,
        required_status_checks: spec.required_status_checks,
      },
    }
  })
  if (!rules.some((r) => r.type === 'required_status_checks')) {
    rules.push({
      type: 'required_status_checks',
      parameters: {
        strict_required_status_checks_policy:
          spec.strict_required_status_checks_policy,
        do_not_enforce_on_create: false,
        required_status_checks: spec.required_status_checks,
      },
    })
  }
  return rules
}

const specs = [
  'protect-develop.json',
  'protect-master.json',
].map((f) => JSON.parse(readFileSync(join(ROOT, '.github/rulesets', f), 'utf8')))

const existing = ghJson(['api', `repos/${REPO}/rulesets`])

for (const spec of specs) {
  const row = existing.find((r) => r.name === spec.name)
  if (!row) {
    console.error(`No ruleset named ${spec.name}`)
    process.exit(1)
  }
  const full = ghJson(['api', `repos/${REPO}/rulesets/${row.id}`])
  const body = {
    name: full.name,
    target: full.target,
    enforcement: full.enforcement,
    conditions: full.conditions,
    bypass_actors: full.bypass_actors,
    rules: overlay(full, spec),
  }
  ghJson(
    [
      'api',
      '--method',
      'PUT',
      `repos/${REPO}/rulesets/${row.id}`,
      '--input',
      '-',
    ],
    JSON.stringify(body),
  )
  console.log(`Updated ${spec.name} (${row.id})`)
}
