/** Infrastructure-only capability declarations; not a runtime editor feature. */
export type OoxmlProfile = "transitional" | "strict" | "extension";
export type OoxmlDimension = "import" | "render" | "edit" | "export" | "preserve";
export type OoxmlLevel = "unknown" | "missing" | "partial" | "supported" | "notApplicable";

export interface OoxmlEvidence {
  file: string;
  case: string;
  dimensions: OoxmlDimension[];
}

export interface OoxmlCapabilitySeed {
  profile: OoxmlProfile;
  namespace: string;
  element: string;
  context: string;
  domain: string;
  /** Static audit findings, not runtime certification. */
  missing: OoxmlDimension[];
  evidence: OoxmlEvidence[];
  limitations: string[];
}
export interface OoxmlCapabilityResult extends OoxmlCapabilitySeed {
  support: Record<OoxmlDimension, OoxmlLevel>;
}
