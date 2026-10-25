import {
  parsePhoneNumberFromString,
  AsYouType,
  getCountries,
  getCountryCallingCode,
  CountryCode,
} from 'libphonenumber-js';

export function flagEmoji(countryCode: string): string {
  if (!countryCode) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

let cachedCountries: CountryOption[] | null = null;

export function getCountryList(): CountryOption[] {
  if (cachedCountries) return cachedCountries;

  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

  cachedCountries = getCountries()
    .map((code) => ({
      code,
      name: displayNames.of(code) || code,
      dialCode: '+' + getCountryCallingCode(code),
      flag: flagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedCountries;
}

export function formatAsYouType(digits: string, country: CountryCode): string {
  if (!digits) return '';
  const formatter = new AsYouType(country);
  return formatter.input(digits);
}

export function toE164(input: string, country: CountryCode): string {
  if (!input) return '';

  if (input.trim().startsWith('+')) {
    const phone = parsePhoneNumberFromString(input.trim());
    return phone?.number || input.trim();
  }

  const phone = parsePhoneNumberFromString(input, country);
  return phone?.number || input;
}

export function detectCountry(e164: string): CountryCode | null {
  if (!e164) return null;
  const phone = parsePhoneNumberFromString(e164);
  return phone?.country ?? null;
}

export function nationalDigits(e164: string, country: CountryCode): string {
  if (!e164) return '';
  const phone = parsePhoneNumberFromString(e164, country);
  if (!phone) return e164;
  return phone.nationalNumber;
}
