/**
 * Pricing Service - TANKR Authoritative Tariff Engine
 * Replicates the database RPC `calculate_booking_quote` for client estimation and unit test oracles.
 */

export interface AuthoritativeQuoteInput {
  basePrice: number;
  pricePerKm: number;
  distanceKm: number;
  hourIST?: number;
}

export interface AuthoritativeQuoteOutput {
  distance_km: number;
  eta_minutes: number;
  base_price: number;
  delivery_charge: number;
  surcharge_amount: number;
  subtotal: number;
  tax_amount: number;
  final_payable_amount: number;
}

/**
 * Calculates distance in kilometers between two coordinates using Haversine formula
 * multiplied by 1.25 road curvature factor (identical to PostGIS ST_Distance * 1.25).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;
  // Apply 1.25 road curvature factor
  return Math.round(straightLineDistance * 1.25 * 100) / 100;
}

/**
 * Calculates authoritative price quote according to Mumbai water logistics tariff rules:
 * - Delivery Charge = distance_km * price_per_km
 * - Surge = 10% on base price during peak hours 18:00 - 22:00 IST
 * - Subtotal = base_price + delivery_charge + surcharge
 * - GST = 5% on subtotal (SAC 9965 / 9967 Water Logistics)
 * - Final Payable = subtotal + GST
 */
export function calculateAuthoritativeQuote(
  input: AuthoritativeQuoteInput
): AuthoritativeQuoteOutput {
  const { basePrice, pricePerKm, distanceKm } = input;

  if (basePrice < 0) {
    throw new Error('Base price must be non-negative');
  }
  if (distanceKm < 0) {
    throw new Error('Distance must be non-negative');
  }
  if (pricePerKm < 0) {
    throw new Error('Price per km must be non-negative');
  }

  // Determine current hour in Indian Standard Time (UTC+5:30) if not specified
  let hourIST = input.hourIST;
  if (hourIST === undefined) {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const istTotalMinutes = utcHours * 60 + utcMinutes + 330;
    hourIST = Math.floor((istTotalMinutes / 60) % 24);
  }

  const roundedDistance = Math.round(distanceKm * 100) / 100;
  const etaMinutes = Math.max(5, Math.round(6 + roundedDistance * 3.3));

  const deliveryCharge = Math.round(roundedDistance * pricePerKm * 100) / 100;

  // 10% peak surcharge between 18:00 and 22:00 IST
  const isPeak = hourIST >= 18 && hourIST <= 22;
  const surcharge = isPeak ? Math.round(basePrice * 0.1 * 100) / 100 : 0.0;

  const subtotal = Math.round((basePrice + deliveryCharge + surcharge) * 100) / 100;
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const finalPayable = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    distance_km: roundedDistance,
    eta_minutes: etaMinutes,
    base_price: Math.round(basePrice * 100) / 100,
    delivery_charge: deliveryCharge,
    surcharge_amount: surcharge,
    subtotal,
    tax_amount: taxAmount,
    final_payable_amount: finalPayable,
  };
}
