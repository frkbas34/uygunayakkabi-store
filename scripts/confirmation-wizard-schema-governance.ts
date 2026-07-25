import assert from 'node:assert'
import { readFileSync } from 'node:fs'

import { CATEGORY_OPTIONS } from '../src/lib/confirmationWizard'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

const wizard = read('src/lib/confirmationWizard.ts')
const products = read('src/collections/Products.ts')
const schemaCheck = read('scripts/wizard-sessions-schema-check.ts')
const schemaApply = read('scripts/wizard-sessions-schema-apply.ts')
const schemaSql = read('scripts/sql/d489-wizard-sessions-schema.sql')
const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}

for (const forbidden of [
  'ALTER TYPE',
  'enum_products_category',
  'CREATE TABLE',
  'ensureWizardTable',
]) {
  assert.ok(
    !wizard.includes(forbidden),
    `confirmation wizard must not perform runtime schema work: ${forbidden}`,
  )
}

for (const phrase of [
  'pre-provisioned `wizard_sessions` table',
  'request handling will not create schema',
]) {
  assert.ok(wizard.includes(phrase), `confirmation wizard must state the D-489 schema boundary: ${phrase}`)
}

for (const phrase of [
  '--confirm-read-only',
  'READ_ONLY',
  'mutationRequested',
  'information_schema',
  'primary-key metadata check',
  'Refusing mutation flags',
]) {
  assert.ok(schemaCheck.includes(phrase), `D-489 schema check must include: ${phrase}`)
}

for (const phrase of [
  '--confirm-apply-d489-wizard-sessions-schema',
  'Dry-run only: no database connection opened and no DDL executed.',
  'Refusing apply',
]) {
  assert.ok(schemaApply.includes(phrase), `D-489 schema apply guard must include: ${phrase}`)
}

assert.ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS public.wizard_sessions'), 'D-489 SQL must create the explicit public table')

assert.ok(
  wizard.includes('productUpdate.category = collected.category'),
  'confirmation wizard must keep applying the operator-selected category through the normal product update',
)

for (const command of ['smoke:wizard-sessions:schema', 'db:wizard-sessions:apply']) {
  assert.ok(packageJson.scripts?.[command], `package command is missing: ${command}`)
}

for (const option of CATEGORY_OPTIONS) {
  assert.ok(
    products.includes(`value: '${option.value}'`),
    `Payload product category options must include wizard value: ${option.value}`,
  )
}

assert.ok(
  (packageJson.scripts?.['test:confirmation-wizard'] ?? '').includes('confirmation-wizard-schema-governance.ts'),
  'confirmation wizard schema governance must run with the focused wizard test',
)

console.log('confirmationWizardSchemaGovernance: confirmation never performs runtime schema DDL - ALL OK')
