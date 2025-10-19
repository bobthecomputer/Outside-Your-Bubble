export type PartnerOutlet = {
  code: string;
  name: string;
  description: string;
  regions: string[];
  languages: string[];
  submissionUrl?: string;
  beta?: boolean;
};

export const PARTNER_OUTLETS: PartnerOutlet[] = [
  {
    code: "global-voices",
    name: "Global Voices",
    description: "Citizen media amplifying local reporters across 50+ countries.",
    regions: ["GLOBAL", "GLOBAL-SOUTH"],
    languages: ["en", "es", "fr", "pt"],
    submissionUrl: "https://globalvoices.org/community/", 
    beta: true,
  },
  {
    code: "rest-of-world",
    name: "Rest of World",
    description: "Technology and culture stories centered on non-Western ecosystems.",
    regions: ["ASIA", "AFRICA", "LATAM"],
    languages: ["en"],
    submissionUrl: "https://restofworld.org/about/", 
    beta: true,
  },
  {
    code: "africa-report",
    name: "The Africa Report Partners",
    description: "Pan-African magazine connecting investigative pitches with regional desks.",
    regions: ["AFRICA"],
    languages: ["en", "fr"],
    submissionUrl: "https://www.theafricareport.com/partners/",
    beta: true,
  },
  {
    code: "asahi-collab",
    name: "Asahi Shimbun Collaborative Desk",
    description: "Japan-focused explainers for global audiences seeking local context.",
    regions: ["ASIA-PACIFIC", "JP"],
    languages: ["ja", "en"],
    submissionUrl: "https://www.asahi.com/ajw/",
    beta: true,
  },
  {
    code: "dw-global-ideas",
    name: "DW Global Ideas",
    description: "Deutsche Welle climate and innovation syndication partners.",
    regions: ["EU", "GLOBAL"],
    languages: ["de", "en", "es"],
    submissionUrl: "https://www.dw.com/en/environment/s-11798",
    beta: true,
  },
  {
    code: "folha-internacional",
    name: "Folha Internacional Collaborative",
    description: "Brazilian newsroom exchange for regional democracy and policy coverage.",
    regions: ["LATAM", "BR"],
    languages: ["pt", "en"],
    submissionUrl: "https://www1.folha.uol.com.br/internacional/",
    beta: true,
  },
];

const BETA_PARTNER_CODES = new Set(
  PARTNER_OUTLETS.filter((partner) => partner.beta).map((partner) => partner.code),
);

export function isBetaPartnerCode(code: string): boolean {
  return BETA_PARTNER_CODES.has(code);
}

export function getPartnerByCode(code: string): PartnerOutlet | undefined {
  return PARTNER_OUTLETS.find((partner) => partner.code === code);
}

export function defaultPartnerCodes(regionTag?: string | null): string[] {
  if (!regionTag) {
    return Array.from(BETA_PARTNER_CODES).slice(0, 3);
  }
  const normalized = regionTag.replace(/^region:/i, "").toUpperCase();
  const matches = PARTNER_OUTLETS.filter((partner) =>
    partner.beta && (partner.regions.includes(normalized) || partner.regions.includes("GLOBAL")),
  );
  if (matches.length === 0) {
    return Array.from(BETA_PARTNER_CODES).slice(0, 3);
  }
  return matches.slice(0, 3).map((partner) => partner.code);
}

export function listBetaPartners(): PartnerOutlet[] {
  return PARTNER_OUTLETS.filter((partner) => partner.beta);
}
