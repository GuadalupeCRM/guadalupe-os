import { CMV_BY_SKU } from '../constants/business'
import type { SKUType } from '../types'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function calcMarginPct(revenue: number, costs: number): number {
  if (revenue === 0) return 0
  return ((revenue - costs) / revenue) * 100
}

export function calcBreakevenProgress(revenue: number): number {
  return Math.min((revenue / 24000) * 100, 100)
}

export function calcCMV(sku: SKUType, units: number): number {
  return (CMV_BY_SKU[sku] || 3.95) * units
}

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function hoursSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
}
