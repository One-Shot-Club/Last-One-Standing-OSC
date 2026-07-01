
// Real case study content from Castletown Liam Mellows GAA and St. Joseph's AFC.
// Imported by case study route pages and the homepage proof section.
// Do not edit the Q&A — these are verbatim quotes from the clubs.

export type CaseStudyStat = {
  k: string;
  v: string;
};

export type CaseStudyQA = {
  q: string;
  a: string;
  attr: string;
};

export type CaseStudy = {
  key: string;
  slug: string;
  clubName: string;
  clubType: string;
  county: string;
  competitionType: string;
  pullQuote: string;
  pullQuoteAttr: string;
  headline: string;
  subheadline: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  crestSrc: string;
  indexLabel: string;
  indexSummary: string;
  indexStatsLine: string;
  benefitsHeading: string;
  stats: CaseStudyStat[];
  qa: CaseStudyQA[];
  benefits: string[];
  ctaHeadline: string;
};

export const CASTLETOWN: CaseStudy = {
  key: "castletown",
  slug: "castletown-liam-mellows",
  clubName: "Castletown Liam Mellows GAA",
  clubType: "GAA",
  county: "Galway",
  competitionType: "World Cup Predictor",
  pullQuote:
    "Probably the easiest fundraiser we've run. From an administration perspective, payments, entries and confirmations were all automated, so there was very little day-to-day management required.",
  pullQuoteAttr: "Donnacha Holmes, Club Player Representative, Castletown Liam Mellows GAA",
  headline: "How Castletown Liam Mellows GAA Raised €1,200+ From One Panel",
  subheadline:
    "Easy online fundraising for GAA clubs — one panel runs the lot. No spreadsheets, no cash handling, no admin headache.",
  seoTitle:
    "GAA Club Fundraising Case Study | Castletown Liam Mellows Raised €1,200+ | OneShotClub",
  seoDescription:
    "See how Castletown Liam Mellows GAA Club used OneShotClub's easy online fundraising platform to raise over €1,200 in one week — automated entries, direct club payments, zero spreadsheets. Built for GAA and Irish sports clubs.",
  canonicalUrl:
    "https://www.oneshotclub.ie/case-studies/castletown-liam-mellows",
  crestSrc: "/castletown-crest.png",
  indexLabel: "Featured case study",
  indexSummary:
    "Easy online fundraising — one panel runs the lot. No spreadsheets, no cash handling, no admin headache.",
  indexStatsLine: "€1,200+ raised · One panel · 100% automated",
  benefitsHeading: "Why GAA clubs choose OneShotClub",
  stats: [
    { k: "€1,200+", v: "Raised in just over a week" },
    { k: "1 Panel", v: "To run the whole fundraiser" },
    { k: "100%", v: "Payments direct to club account" },
  ],
  qa: [
    {
      q: "How easy was setup and day-to-day admin?",
      a: "The setup process was very straightforward and we had the competition live in no time. From an administration perspective, it was probably the easiest fundraiser we've run. Payments, entries and confirmations were all automated, so there was very little day-to-day management required. The amount of volunteer time saved compared to previous fundraisers was significant.",
      attr: "Donnacha Holmes, Club Player Representative",
    },
    {
      q: "What feedback did you hear from club members?",
      a: "The feedback was overwhelmingly positive. Members commented on how easy it was to enter, how professional the website looked, and how simple it was to pay using card or Apple Pay. The automatic email confirmations were also appreciated. From the club's perspective, people liked that payments went directly to the club account and that there was no paperwork, spreadsheets or manual administration involved.",
      attr: "Donnacha Holmes, Club Player Representative",
    },
    {
      q: "What surprised you most about using an online fundraising platform?",
      a: "What surprised us most was how quickly people entered and how little administration was required. In previous fundraisers, a huge amount of time would be spent collecting payments, updating spreadsheets and dealing with queries. With OneShotClub, that work was largely eliminated, allowing us to focus on promoting the fundraiser and driving participation.",
      attr: "Donnacha Holmes, Club Player Representative",
    },
    {
      q: "What would you say to another GAA club considering a fundraiser?",
      a: "If you're considering running a fundraiser, I'd strongly recommend giving OneShotClub a try. It removes many of the headaches traditionally associated with club fundraising, looks professional, makes it easy for people to enter, and significantly reduces the workload on volunteers. We were able to raise over €1,200 for the club in just over a week with very little administration, which speaks for itself.",
      attr: "Donnacha Holmes, Club Player Representative",
    },
  ],
  benefits: [
    "Extremely easy setup — competition live in minutes, not days",
    "One panel handles entries, payments and confirmations",
    "Payments go directly to the club's own account",
    "No cash handling, no personal bank accounts involved",
    "Professional-looking fundraising pages that build trust with members",
    "Easy to share inside and outside the club — perfect for WhatsApp and social media",
    "Card and Apple Pay supported for fast, frictionless entry",
    "Significantly reduces volunteer admin time vs spreadsheets and manual collection",
  ],
  ctaHeadline: "Want results like Castletown's for your club?",
};

export const ST_JOSEPHS: CaseStudy = {
  key: "st-josephs",
  slug: "st-josephs-afc",
  clubName: "St. Joseph's AFC",
  clubType: "Soccer",
  county: "Sligo",
  competitionType: "World Cup Predictor",
  pullQuote:
    "We've tried other platforms, sites and apps, and by far OneShotClub is the easiest. Setup and day-to-day was extremely easy to manage — all at the click of one button.",
  pullQuoteAttr: "St. Joseph's AFC, Fundraising Committee",
  headline: "How St. Joseph's AFC Raised €1,300 in 4 Days From One Panel",
  subheadline:
    "A late start, a short window, and one simple panel to run the lot. No tickets, no sheets, no chasing money.",
  seoTitle:
    "Soccer Club Fundraising Case Study | St. Joseph's AFC Raised €1,300 in 4 Days | OneShotClub",
  seoDescription:
    "See how St. Joseph's AFC used OneShotClub to raise €1,300 in just 4 days — despite a late start. Easy online fundraising for Irish soccer and GAA clubs.",
  canonicalUrl: "https://www.oneshotclub.ie/case-studies/st-josephs-afc",
  crestSrc: "/st-josephs-crest.png",
  indexLabel: "Soccer club case study",
  indexSummary:
    "A World Cup Predictor, a late start, and the whole fundraiser run from one simple panel.",
  indexStatsLine: "€1,300 raised · 4 days · One panel",
  benefitsHeading: "Why clubs choose OneShotClub",
  stats: [
    { k: "€1,300", v: "Raised in just 4 days" },
    { k: "1 Panel", v: "To run the whole fundraiser" },
    { k: "4 Days", v: "From launch to finish" },
  ],
  qa: [
    {
      q: "Tell us about the fundraiser you ran.",
      a: "We ran a World Cup Predictor. We were very late getting it off the mark, but we're delighted with the success it had in such a short timeframe.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
    {
      q: "What did you do before, and how did this compare?",
      a: "Before, we used many different ways to sell tickets — lines, sheets, all sorts. All very labour-intensive, both for the people selling and the people managing and collecting money. OneShotClub was very straightforward, quick and easy to use for us volunteers in the club.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
    {
      q: "Why did you choose OneShotClub?",
      a: "OneShotClub gave us a very user-friendly platform that let us be really efficient with our fundraising. We've tried other platforms, sites and apps, and by far OneShotClub is the easiest — best experience for both the customer and the club admin.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
    {
      q: "How easy was setup and day-to-day admin?",
      a: "Setup and day-to-day management was extremely easy to use, manage and monitor the whole way through. All at the click of one button.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
    {
      q: "What feedback did you hear from members?",
      a: "People told us how easy it was to use, how quick they could pick their selections, how easy it was to pay and follow the instructions.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
    {
      q: "What surprised you most?",
      a: "The ease of use — for both the user and the admin side. Including how money was collected and tracked.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
    {
      q: "What would you say to another club officer?",
      a: "If you're looking for support fundraising for your local club or any organisation, OneShotClub is definitely the place to go. Everything is straightforward and easy to use.",
      attr: "St. Joseph's AFC, Fundraising Committee",
    },
  ],
  benefits: [
    "Live in days, not weeks — even with a late start",
    "One panel runs the whole fundraiser — nothing else needed",
    "Far less work than tickets, lines or sheets",
    "Easy for members to pick and pay in seconds",
    "Money collected and tracked automatically",
    "Same simple experience for the volunteer admin",
    "Card and Apple Pay for fast, no-fuss entry",
    "Works for soccer clubs and GAA clubs alike",
  ],
  ctaHeadline: "Want results like St. Joseph's for your club?",
};

export const ALL_CASE_STUDIES: CaseStudy[] = [CASTLETOWN, ST_JOSEPHS];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return ALL_CASE_STUDIES.find((cs) => cs.slug === slug);
}

// Summary stats for the homepage proof section
export const PLATFORM_STATS = {
  totalRaised: "~€7,000",
  totalCompetitions: 5,
  competitionBreakdown: "1 golf, 4 prediction",
  averageTurnaround: "under 2 weeks",
  contactModel: "1 contact per club, start to finish",
} as const;
