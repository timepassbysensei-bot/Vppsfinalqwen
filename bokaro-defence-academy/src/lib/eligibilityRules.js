// Eligibility rules for defence academy admissions
// Age calculations based on current date
// Always verify with official recruitment notifications

export const EXAMS = {
  AGNIVEER_GD: 'Agniveer GD',
  SSC_GD: 'SSC GD',
  NDA: 'NDA',
  JHARKHAND_POLICE: 'Jharkhand Police',
}

export const GENDERS = {
  MALE: 'Male',
  FEMALE: 'Female',
}

// Age limits in years (min, max)
const AGE_LIMITS = {
  [EXAMS.AGNIVEER_GD]: { min: 17.5, max: 21 },
  [EXAMS.SSC_GD]: { min: 18, max: 23 },
  [EXAMS.NDA]: { min: 16.5, max: 19.5 },
  [EXAMS.JHARKHAND_POLICE]: { min: 18, max: 28 },
}

// Height requirements in cm (male, female)
const HEIGHT_REQUIREMENTS = {
  [EXAMS.AGNIVEER_GD]: { male: 160, female: 152 },
  [EXAMS.SSC_GD]: { male: 157, female: 150 },
  [EXAMS.NDA]: { male: 157.5, female: 152 },
  [EXAMS.JHARKHAND_POLICE]: { male: 162, female: 155 },
}

/**
 * Calculate age from date of birth
 * @param {string} dobStr - Date of birth in YYYY-MM-DD format
 * @returns {number} - Age in years with decimal precision
 */
export function calculateAge(dobStr) {
  const dob = new Date(dobStr)
  const today = new Date()
  
  if (isNaN(dob.getTime())) {
    return null
  }
  
  const ageMs = today - dob
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)
  return ageYears
}

/**
 * Check eligibility for a specific exam
 * @param {Object} params
 * @param {string} params.dob - Date of birth
 * @param {string} params.gender - Gender (Male/Female)
 * @param {number} params.height - Height in cm
 * @param {string} params.targetExam - Target exam
 * @returns {Object} - Eligibility result
 */
export function checkEligibility({ dob, gender, height, targetExam }) {
  const age = calculateAge(dob)
  
  if (age === null) {
    return {
      valid: false,
      errors: ['Invalid date of birth'],
      age: null,
      heightStatus: 'unknown',
      disclaimer: 'Indicative eligibility only. Always verify the latest official recruitment notification.',
    }
  }
  
  const errors = []
  const ageLimit = AGE_LIMITS[targetExam]
  const heightReq = HEIGHT_REQUIREMENTS[targetExam]
  
  if (!ageLimit || !heightReq) {
    return {
      valid: false,
      errors: ['Unknown exam type'],
      age,
      heightStatus: 'unknown',
      disclaimer: 'Indicative eligibility only. Always verify the latest official recruitment notification.',
    }
  }
  
  // Age check
  if (age < ageLimit.min || age > ageLimit.max) {
    errors.push(`Age must be between ${ageLimit.min} and ${ageLimit.max} years for ${targetExam}`)
  }
  
  // Height check
  const genderKey = gender.toLowerCase()
  const requiredHeight = heightReq[genderKey]
  
  if (!requiredHeight) {
    errors.push('Invalid gender selection')
  } else if (height < requiredHeight) {
    errors.push(`Minimum height requirement for ${targetExam} (${gender}): ${requiredHeight} cm`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    age: Math.floor(age),
    ageExact: age.toFixed(1),
    heightEntered: height,
    heightRequired: requiredHeight,
    heightStatus: height >= requiredHeight ? 'meets' : 'below',
    ageRange: `${ageLimit.min}-${ageLimit.max} years`,
    disclaimer: 'Indicative eligibility only. Always verify the latest official recruitment notification.',
  }
}

/**
 * Generate WhatsApp message for eligibility result
 * @param {Object} result - Eligibility check result
 * @param {string} targetExam - Target exam name
 * @returns {string} - Prefilled WhatsApp message
 */
export function generateWhatsAppMessage(result, targetExam) {
  const status = result.valid ? '✅ Eligible' : '❌ Not Eligible'
  const message = `*Bokaro Defence Academy - Eligibility Check*\n\n` +
    `Target Exam: ${targetExam}\n` +
    `Age: ${result.ageExact} years (${result.ageRange})\n` +
    `Height: ${result.heightEntered} cm (Required: ${result.heightRequired} cm)\n` +
    `Status: ${status}\n\n` +
    `${result.disclaimer}\n\n` +
    `Contact Manish Sir: +91 95259 73090`
  
  return encodeURIComponent(message)
}
