"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode } from "libphonenumber-js"
import { getCountryFlagEmojiFromCountryCode, getCountryNameFromCountryCode } from "country-codes-flags-phone-codes"

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  onCountryChange: (countryCode: string) => void
  countryCode: string
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
  disabled?: boolean
  id?: string
  onErrorChange?: (error: string) => void
}

// Popular countries first, then alphabetical
const POPULAR_COUNTRIES = [
  'ZA', 'US', 'CA', 'GB', 'DE', 'FR', 'CN', 'IN', 'JP', 'AU', 'BR'
]

const ALL_COUNTRIES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]

export default function PhoneInput({
  value,
  onChange,
  onCountryChange,
  countryCode,
  label,
  placeholder,
  required = false,
  className = "",
  error,
  disabled = false,
  id = "phone",
  onErrorChange
}: PhoneInputProps) {
  const [phoneError, setPhoneError] = useState("")
  const [formattedValue, setFormattedValue] = useState("")

  // Get country data
  const getCountryData = (code: string) => {
    try {
      const flag = getCountryFlagEmojiFromCountryCode(code)
      const name = getCountryNameFromCountryCode(code)
      const callingCode = getCountryCallingCode(code as any)
      
      // Return null if any of the data is invalid
      if (!flag || !name || !callingCode) {
        return null
      }
      
      return { flag, name, callingCode }
    } catch {
      return null
    }
  }

  // Validate phone number
  const validatePhone = (phone: string, country: string) => {
    if (!phone.trim()) {
      setPhoneError("")
      onErrorChange?.("")
      return { isValid: true, formatted: phone }
    }

    try {
      const fullNumber = `+${getCountryCallingCode(country as any)}${phone}`
      const phoneNumber = parsePhoneNumber(fullNumber)
      
      if (phoneNumber && isValidPhoneNumber(phoneNumber.number)) {
        setPhoneError("")
        onErrorChange?.("")
        return { 
          isValid: true, 
          formatted: phoneNumber.nationalNumber,
          international: phoneNumber.formatInternational()
        }
      } else {
        const errorMsg = "Please enter a valid phone number"
        setPhoneError(errorMsg)
        onErrorChange?.(errorMsg)
        return { isValid: false, formatted: phone }
      }
    } catch (error) {
      const errorMsg = "Please enter a valid phone number"
      setPhoneError(errorMsg)
      onErrorChange?.(errorMsg)
      return { isValid: false, formatted: phone }
    }
  }

  // Handle phone number change
  const handlePhoneChange = (newValue: string) => {
    // Remove any non-digit characters except +
    const cleanValue = newValue.replace(/[^\d]/g, '')
    onChange(cleanValue)
    
    // Validate and format
    const validation = validatePhone(cleanValue, countryCode)
    setFormattedValue(validation.formatted)
  }

  // Handle country change
  const handleCountryChange = (newCountryCode: string) => {
    onCountryChange(newCountryCode)
    // Re-validate with new country
    const validation = validatePhone(value, newCountryCode)
    setFormattedValue(validation.formatted)
  }

  // Get sorted countries list
  const getSortedCountries = () => {
    const popular = POPULAR_COUNTRIES
      .map(code => {
        const countryData = getCountryData(code)
        return countryData ? { code, ...countryData } : null
      })
      .filter(country => country !== null) // Filter out null countries
    
    const others = ALL_COUNTRIES
      .filter(code => !POPULAR_COUNTRIES.includes(code))
      .map(code => {
        const countryData = getCountryData(code)
        return countryData ? { code, ...countryData } : null
      })
      .filter(country => country !== null) // Filter out null countries
      .sort((a, b) => a.name.localeCompare(b.name))
    
    return [...popular, ...others]
  }

  const sortedCountries = getSortedCountries()
  const currentCountry = getCountryData(countryCode) || { flag: "🏳️", name: "Unknown", callingCode: "+1" }
  
  // Fallback to a valid country if current one is invalid
  const validCountryCode = currentCountry.name === "Unknown" ? "ZA" : countryCode

  // Re-validate when country changes
  useEffect(() => {
    if (value) {
      const validation = validatePhone(value, countryCode)
      setFormattedValue(validation.formatted)
    }
  }, [countryCode, value])

  // Update country code if current one is invalid
  useEffect(() => {
    if (currentCountry.name === "Unknown" && validCountryCode !== countryCode) {
      onCountryChange(validCountryCode)
    }
  }, [currentCountry.name, validCountryCode, countryCode, onCountryChange])

  return (
    <div className={className}>
      {label && (
        <Label htmlFor="phone">
          {label} {required && <span className="text-red-500">*</span>}
      </Label>
      )}
      
      <div className="flex flex-col sm:flex-row gap-2 mt-1">
        {/* Country Selector */}
        <Select 
          value={validCountryCode} 
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full sm:w-40 h-10">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-lg">{currentCountry.flag}</span>
                <span className="font-mono text-sm">+{currentCountry.callingCode}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60 w-full sm:w-auto z-50">
            {sortedCountries.map((country) => (
              <SelectItem 
                key={country.code} 
                value={country.code}
                className="text-sm cursor-pointer py-3 px-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-lg flex-shrink-0">{country.flag}</span>
                  <span className="font-medium flex-1 truncate text-left">{country.name}</span>
                  <span className="font-mono text-gray-500 text-xs flex-shrink-0">+{country.callingCode}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Phone Number Input */}
        <div className="flex-1 min-w-0">
        <Input
          id={id}
            type="tel"
            value={formattedValue}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={placeholder || `Enter phone number`}
          required={required}
            disabled={disabled}
            className={`h-10 ${phoneError || error ? 'border-red-500 focus:border-red-500' : ''}`}
        />
          {(phoneError || error) && (
            <p className="text-red-500 text-xs mt-1">{phoneError || error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

