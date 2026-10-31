import { z } from 'zod';
import { CreateBookingSchema } from '../../../src/types/booking';

// Indian GSTIN Validator (15 alphanumeric characters: 2 state digits + 10 PAN chars + 1 entity + 1 'Z' + 1 check digit)
const GstinSchema = z.string().regex(
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  'Invalid Indian GSTIN format'
);

// Indian Mobile Number Validator (+91 prefix followed by 10 digits starting with 6-9)
const PhoneSchema = z.string().regex(
  /^\+91[6-9][0-9]{9}$/,
  'Invalid Indian mobile phone number'
);

// Flow Meter Reading Boundary Validator
const FlowMeterSchema = z.object({
  startReading: z.number().nonnegative(),
  endReading: z.number().nonnegative(),
  tankerCapacity: z.number().positive(),
}).refine((data) => data.endReading >= data.startReading, {
  message: 'Ending meter reading cannot be lower than starting meter reading',
  path: ['endReading'],
}).refine((data) => (data.endReading - data.startReading) <= data.tankerCapacity * 1.05, {
  message: 'Delivered volume exceeds tanker physical capacity by more than 5% tolerance',
  path: ['endReading'],
});

describe('TANKR Unit QA — Zod Contract & Boundary Validations', () => {
  describe('CreateBookingSchema Validation', () => {
    test('TC-UNIT-06: accepts valid booking payload', () => {
      const payload = {
        tankerId: '550e8400-e29b-41d4-a716-446655440000',
        deliveryAddress: 'Flat 402, Building 7, Marol Military Road, Andheri East, Mumbai',
        deliveryLat: 19.1171,
        deliveryLng: 72.8809,
        paymentPreference: 'upi',
      };

      const result = CreateBookingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    test('TC-UNIT-07: rejects invalid UUID for tankerId', () => {
      const payload = {
        tankerId: 'invalid-non-uuid-string',
        deliveryAddress: 'Valid address in Mumbai',
        deliveryLat: 19.1171,
        deliveryLng: 72.8809,
        paymentPreference: 'upi',
      };

      const result = CreateBookingSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message.toLowerCase()).toContain('uuid');
      }
    });

    test('TC-UNIT-08: rejects delivery address with fewer than 5 characters', () => {
      const payload = {
        tankerId: '550e8400-e29b-41d4-a716-446655440000',
        deliveryAddress: 'Home',
        deliveryLat: 19.1171,
        deliveryLng: 72.8809,
        paymentPreference: 'cash_on_delivery',
      };

      const result = CreateBookingSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Indian Compliance & Format Validation', () => {
    test('TC-UNIT-09: validates authentic Indian GSTIN', () => {
      const validGstin = '27AABCS1429B1ZB';
      expect(GstinSchema.safeParse(validGstin).success).toBe(true);
    });

    test('TC-UNIT-10: rejects corrupt or lowercase GSTIN', () => {
      expect(GstinSchema.safeParse('27aabcs1429b1zb').success).toBe(false);
      expect(GstinSchema.safeParse('12345').success).toBe(false);
    });

    test('TC-UNIT-11: validates authentic E.164 Indian mobile phone number', () => {
      expect(PhoneSchema.safeParse('+919820012345').success).toBe(true);
      expect(PhoneSchema.safeParse('+911820012345').success).toBe(false); // Does not start with 6-9
      expect(PhoneSchema.safeParse('9820012345').success).toBe(false); // Missing +91
    });
  });

  describe('Flow Meter Handshake Bounds', () => {
    test('TC-UNIT-12: accepts valid start and end flow meter readings', () => {
      const result = FlowMeterSchema.safeParse({
        startReading: 10450.0,
        endReading: 15450.0, // 5000L delivered
        tankerCapacity: 5000,
      });

      expect(result.success).toBe(true);
    });

    test('TC-UNIT-13: strictly rejects end reading lower than start reading', () => {
      const result = FlowMeterSchema.safeParse({
        startReading: 15450.0,
        endReading: 12000.0, // Meter counter ran backwards
        tankerCapacity: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lower than starting meter reading');
      }
    });

    test('TC-UNIT-14: rejects physically impossible delivered volume exceeding tanker capacity', () => {
      const result = FlowMeterSchema.safeParse({
        startReading: 1000.0,
        endReading: 15000.0, // 14,000L from a 5,000L tanker
        tankerCapacity: 5000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exceeds tanker physical capacity');
      }
    });
  });
});
