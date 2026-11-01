import { z } from 'zod';
export const canEditTariffs = (role: string | null) => role === 'admin';
export const pricingSchema = z.object({
  rates: z.array(z.number().finite().min(0).max(100000)).min(1).max(20),
  minimumHours: z.number().finite().min(0).max(24),
  packingRate: z.number().finite().min(0).max(100000),
  weekendPercent: z.number().finite().min(0).max(100),
  travelPerMile: z.number().finite().min(0).max(1000),
  weightRate: z.number().finite().min(0).max(1000),
  mileRate: z.number().finite().min(0).max(1000),
  truckFee: z.number().finite().min(0).max(100000).default(0),
  materials: z.array(z.object({ name: z.string().trim().min(1).max(120), price: z.number().finite().min(0).max(100000) }).strip()).max(200),
}).strip();