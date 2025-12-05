/**
 * Validation utilities for form inputs
 */

/**
 * Validates Thai phone number format
 * @param phone - Phone number string to validate
 * @returns true if valid (10 digits starting with 0)
 */
export function validatePhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone);
}

/**
 * Validates phone number and returns error message if invalid
 * @param phone - Phone number string to validate
 * @returns Error message string or null if valid
 */
export function getPhoneValidationError(phone: string): string | null {
  if (!phone) {
    return "กรุณากรอกเบอร์โทรศัพท์";
  }
  if (!validatePhone(phone)) {
    return "กรอกเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลักและขึ้นต้นด้วย 0)";
  }
  return null;
}
