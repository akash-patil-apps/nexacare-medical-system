/**
 * Schema for parsed Mayo Interpretive Handbook output.
 * Used by parse-mayo-interpretive script and seed scripts.
 */

export interface ReferenceRangeGroup {
  group: string; // e.g. "Male", "Female", "0-18 years", "Adults"
  unit?: string;
  normalRange: string;
}

export interface MayoParsedParameter {
  parameterName: string;
  unit?: string;
  normalRange?: string;
  referenceRangesByGroup?: ReferenceRangeGroup[];
  sortOrder?: number;
  isRequired?: boolean;
}

export interface MayoParsedTest {
  code?: string;
  number?: string; // Test number from handbook
  name: string;
  parameters: MayoParsedParameter[];
}

export interface MayoInterpretiveParsed {
  source: string;
  parsedAt: string; // ISO date
  tests: MayoParsedTest[];
}
