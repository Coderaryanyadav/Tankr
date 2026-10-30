import { z } from 'zod';

/**
 * Validates Indian Mobile Numbers (10 digits starting with 6, 7, 8, or 9)
 */
export const IndianPhoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

/**
 * Validates Indian Postal PIN codes (6 numeric digits, non-zero first digit)
 */
export const IndianPincodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Must be a valid 6-digit postal PIN code');

/**
 * Validates Geographic Coordinates
 */
export const CoordinatesSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Customer Onboarding Submission Schema
 */
export const OnboardingFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(70, 'Full name must be less than 70 characters'),
  profilePhotoUrl: z.string().optional().nullable(),
  flatOrBuilding: z
    .string()
    .trim()
    .min(2, 'Apartment / House / Building details are required'),
  streetAddress: z
    .string()
    .trim()
    .min(3, 'Street / Area details are required'),
  landmark: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  pincode: IndianPincodeSchema,
  latitude: z.number(),
  longitude: z.number(),
  label: z.enum(['home', 'work', 'other']),
  customName: z.string().trim().optional(),
});

export type OnboardingFormData = z.infer<typeof OnboardingFormSchema>;

/**
 * Saved Address Schema
 */
export const SavedAddressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.enum(['home', 'work', 'other']),
  customName: z.string().optional(),
  flatOrBuilding: z.string().min(2),
  streetAddress: z.string().min(3),
  landmark: z.string().optional(),
  city: z.string().min(2),
  pincode: IndianPincodeSchema,
  latitude: z.number(),
  longitude: z.number(),
  isDefault: z.boolean().default(false),
});

export type SavedAddressInput = z.infer<typeof SavedAddressSchema>;

