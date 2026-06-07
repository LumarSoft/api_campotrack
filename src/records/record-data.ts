import { BadRequestException } from '@nestjs/common'
import { RecordSubtype } from 'generated/prisma/client'

type RawData = Record<string, unknown>

function requiredString(data: RawData, key: string): string {
  const value = data[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`Field "${key}" is required`)
  }
  return value.trim()
}

function optionalString(data: RawData, key: string): string | undefined {
  const value = data[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new BadRequestException(`Field "${key}" must be text`)
  return value.trim()
}

function requiredNumber(data: RawData, key: string): number {
  const value = typeof data[key] === 'number' ? (data[key] as number) : Number(data[key])
  if (!Number.isFinite(value)) throw new BadRequestException(`Field "${key}" must be a number`)
  return value
}

function optionalNumber(data: RawData, key: string): number | undefined {
  if (data[key] === undefined || data[key] === null || data[key] === '') return undefined
  return requiredNumber(data, key)
}

function oneOf<T extends string>(data: RawData, key: string, allowed: readonly T[]): T {
  const value = data[key]
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestException(`Field "${key}" must be one of: ${allowed.join(', ')}`)
  }
  return value as T
}

/** Drops undefined keys so optional fields are not persisted as null. */
function compact(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}

/**
 * Validates and whitelists the subtype-specific payload (info.md §8). Never
 * trusts the raw client object — only known fields are kept.
 */
export function validateRecordData(subtype: RecordSubtype, data: RawData): Record<string, unknown> {
  switch (subtype) {
    case RecordSubtype.SOWING:
      return compact({
        variety: requiredString(data, 'variety'),
        seedDose: requiredString(data, 'seedDose'),
        ha: requiredNumber(data, 'ha'),
      })
    case RecordSubtype.FERTILIZATION:
      return compact({
        product: requiredString(data, 'product'),
        dose: requiredString(data, 'dose'),
      })
    case RecordSubtype.PHYTOSANITARY:
      return compact({
        product: requiredString(data, 'product'),
        dose: requiredString(data, 'dose'),
        temperature: optionalNumber(data, 'temperature'),
        wind: optionalString(data, 'wind'),
        humidity: optionalNumber(data, 'humidity'),
      })
    case RecordSubtype.OBSERVATION:
      return compact({
        kind: oneOf(data, 'kind', ['PEST', 'DISEASE', 'WEED', 'OTHER'] as const),
        description: requiredString(data, 'description'),
      })
    case RecordSubtype.HARVEST:
      return compact({
        yield: requiredNumber(data, 'yield'),
        yieldUnit: oneOf(data, 'yieldUnit', ['QQ_HA', 'TN_HA'] as const),
        grainMoisture: optionalNumber(data, 'grainMoisture'),
      })
    default:
      throw new BadRequestException('Unknown record subtype')
  }
}
