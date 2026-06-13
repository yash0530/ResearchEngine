// The 12-sector AI-infrastructure taxonomy — the seed source of truth.
// Reconstructed from ResearchApp/lib/taxonomy.ts (125 tickers / 14 themes) mapped
// into the ENGINE 12-sector model, plus CRDO / OKLO / SMR which the news queries
// and static catalysts reference.
//
// Tickers may belong to multiple sectors (genuinely distinct exposures only —
// e.g. AVGO sells both AI silicon and optical interconnect). Editing membership
// here + `npm run seed` is the supported way to reshape the universe.

export const STAGES = ["early", "inflecting", "popping", "crowded", "reset"] as const;
export type StageName = (typeof STAGES)[number];

export const DRIVERS: Record<number, string> = {
  1: "Hyperscaler AI capex",
  2: "Grid & electrification supercycle",
  3: "Physical AI adoption",
  4: "Defense procurement",
  5: "Edge & device AI",
};

export type SectorSeed = {
  code: string;
  name: string;
  driver: 1 | 2 | 3 | 4 | 5;
  stage: StageName; // initial rating only — never clobbers a human rating on re-seed
  color: string;
  note: string;
  newsQuery: string; // Google News RSS query; the news job appends " when:2d"
  tickers: string[];
};

export const SECTOR_SEEDS: SectorSeed[] = [
  {
    code: "00",
    name: "Memory & Storage",
    driver: 1,
    stage: "popping",
    color: "#0f766e",
    note: "DRAM/HBM/NAND price cycle. Kill risk: contract pricing rolls over while capex stalls (see memory_exit tripwire).",
    newsQuery: '"DRAM price" OR "NAND price" OR Micron OR SanDisk OR HBM',
    tickers: ["MU", "SNDK", "WDC", "STX"],
  },
  {
    code: "01",
    name: "AI Compute & Silicon Design",
    driver: 1,
    stage: "crowded",
    color: "#2563eb",
    note: "GPU/accelerator/custom-ASIC silicon plus the EDA/IP toolchain that designs it.",
    newsQuery: 'Nvidia OR Broadcom ASIC OR "AI chip"',
    // ANSS excluded: acquired by Synopsys and delisted — SNPS/CDNS carry the EDA exposure.
    tickers: ["NVDA", "AMD", "AVGO", "MRVL", "INTC", "ARM", "SNPS", "CDNS"],
  },
  {
    code: "02",
    name: "Foundry, Semicap & Packaging",
    driver: 1,
    stage: "inflecting",
    color: "#7c3aed",
    note: "Foundries, wafer equipment, advanced packaging (CoWoS), test. Picks and shovels for sector 01.",
    newsQuery: 'TSMC OR ASML OR CoWoS OR "chip equipment"',
    tickers: [
      "TSM", "ASML", "AMAT", "LRCX", "KLAC", "ONTO", "ACLS", "TER",
      "AMKR", "MKSI", "COHU", "CAMT", "FORM", "ICHR", "UCTT",
    ],
  },
  {
    code: "03",
    name: "Networking, Optics & Interconnect",
    driver: 1,
    stage: "popping",
    color: "#0891b2",
    note: "Cluster switching, optical transceivers, copper/optical interconnect — the data-movement bottleneck.",
    newsQuery: '"optical transceiver" OR "AI networking" OR Astera OR Credo',
    tickers: [
      "ANET", "CSCO", "CIEN", "COHR", "LITE", "FN", "ALAB", "CRDO",
      "GLW", "APH", "TEL", "AVGO", "MRVL",
    ],
  },
  {
    code: "04",
    name: "Data-Center Power & Nuclear",
    driver: 1,
    stage: "popping",
    color: "#ca8a04",
    note: "Generation for AI load: IPPs, nuclear PPAs, SMR cohort, fuel cells, turbines.",
    newsQuery: '"data center power" OR "nuclear PPA" OR SMR reactor',
    tickers: ["CEG", "VST", "TLN", "NEE", "SO", "NRG", "BE", "GEV", "OKLO", "SMR"],
  },
  {
    code: "05",
    name: "Grid Equipment & Materials",
    driver: 2,
    stage: "inflecting",
    color: "#92400e",
    note: "Transformers, switchgear, grid construction plus copper/steel/cables. Candidate to split into equipment vs materials later.",
    newsQuery: 'transformer shortage OR switchgear OR "grid equipment"',
    tickers: [
      "ETN", "HUBB", "PWR", "NVT", "EMR", "GNRC", "FLNC",
      "FCX", "SCCO", "TECK", "BDC", "WCC", "NUE", "STLD",
    ],
  },
  {
    code: "06",
    name: "Cooling & Thermal",
    driver: 1,
    stage: "popping",
    color: "#0284c7",
    note: "Liquid cooling, HVAC, dense-rack heat removal, water systems.",
    newsQuery: '"liquid cooling" OR Vertiv "data center"',
    tickers: ["VRT", "TT", "CARR", "JCI", "DOV", "MOD", "AAON", "XYL", "WTS"],
  },
  {
    code: "07",
    name: "Data Centers & Neoclouds",
    driver: 1,
    stage: "crowded",
    color: "#16a34a",
    note: "DC REITs, AI campuses, neoclouds, converted miners. Most financing-sensitive sector (see credit_proxy tripwire).",
    newsQuery: 'CoreWeave OR Nebius OR neocloud OR "data center construction"',
    tickers: [
      "EQIX", "DLR", "IRM", "AMT", "CCI", "SBAC", "DBRG", "GDS",
      "NBIS", "CORZ", "IREN", "CIFR", "WULF", "APLD", "CRWV",
    ],
  },
  {
    code: "08",
    name: "AI Servers & Hardware",
    driver: 1,
    stage: "inflecting",
    color: "#475569",
    note: "Server OEM/ODM, storage systems, contract manufacturing, 800V power modules.",
    newsQuery: '"AI server" OR "power module" OR 800V "data center"',
    tickers: ["DELL", "HPE", "SMCI", "NTAP", "PSTG", "CLS", "FLEX", "JBL", "SANM", "MPWR"],
  },
  {
    code: "09",
    name: "Robotics & Physical AI",
    driver: 3,
    stage: "early",
    color: "#db2777",
    note: "Industrial automation, machine vision, humanoids, warehouse robotics, embodied AI.",
    newsQuery: 'humanoid robot OR "physical AI"',
    tickers: ["ROK", "ISRG", "HON", "ZBRA", "CGNX", "SYM", "TSLA", "SERV", "ABBNY", "TER"],
  },
  {
    code: "10",
    name: "Drones & Defense",
    driver: 4,
    stage: "inflecting",
    color: "#b91c1c",
    note: "Military drones, counter-UAS, defense electronics, autonomy platforms. Anduril IPO watch.",
    newsQuery: 'military drone OR counter-UAS OR AeroVironment',
    tickers: ["AVAV", "KTOS", "RCAT", "RTX", "LMT", "NOC", "GD", "BA", "ACHR", "JOBY", "EH"],
  },
  {
    code: "11",
    name: "Edge AI & Industrial Chips",
    driver: 5,
    stage: "early",
    color: "#4f46e5",
    note: "On-device inference, NPU, analog/embedded/automotive silicon. Hailo IPO watch.",
    newsQuery: '"edge AI" OR "on-device AI" OR NPU',
    tickers: ["QCOM", "NXPI", "TXN", "ADI", "MPWR", "MCHP", "ON", "STM"],
  },
];

// Benchmarks are pulled daily like everything else but belong to no sector, so
// they never skew sector averages. Hyperscalers feed the capex watch; HYG/IEF
// feed the credit_proxy tripwire.
export const BENCHMARKS: { symbol: string; name: string }[] = [
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "ORCL", name: "Oracle" },
  { symbol: "HYG", name: "iShares High Yield Corporate Bond ETF" },
  { symbol: "IEF", name: "iShares 7-10 Year Treasury Bond ETF" },
];

export const MANUAL_SERIES = [
  "ddr5_contract_mom",
  "nand_contract_mom",
  "gpu_rental_dir",
  "capex_flag",
] as const;
export type ManualSeriesName = (typeof MANUAL_SERIES)[number];

export const MANUAL_SERIES_META: Record<
  ManualSeriesName,
  { label: string; hint: string }
> = {
  ddr5_contract_mom: {
    label: "DDR5 contract price MoM %",
    hint: "Monthly. Enter the month-over-month % change in DDR5 contract pricing (e.g. 2.0 or -3.5).",
  },
  nand_contract_mom: {
    label: "NAND contract price MoM %",
    hint: "Monthly. Month-over-month % change in NAND contract pricing.",
  },
  gpu_rental_dir: {
    label: "GPU rental price direction",
    hint: "Direction of spot GPU rental pricing: -1 falling, 0 flat, +1 rising.",
  },
  capex_flag: {
    label: "Hyperscaler capex flag",
    hint: "-1 = a Mag-7 guided capex DOWN, 0 = neutral, +1 = guided capex UP. Feeds capex_guide_cut and memory_exit tripwires.",
  },
};

export const STATIC_CATALYSTS: {
  d: string | null;
  kind: string;
  sectorCode: string | null;
  symbol: string | null;
  title: string;
}[] = [
  {
    d: "2026-07-04",
    kind: "deadline",
    sectorCode: "04",
    symbol: null,
    title: "DOE reactor-criticality target (Oklo/SMR cohort)",
  },
  {
    d: "2026-07-29",
    kind: "earnings",
    sectorCode: "06",
    symbol: "VRT",
    title: "Vertiv Q2 — cooling backlog conversion check",
  },
  { d: null, kind: "ipo", sectorCode: "10", symbol: null, title: "Anduril IPO watch" },
  { d: null, kind: "ipo", sectorCode: "11", symbol: null, title: "Hailo IPO watch" },
];

export function sectorSeedByCode(code: string): SectorSeed | undefined {
  return SECTOR_SEEDS.find((s) => s.code === code);
}

export const ALL_SEED_SYMBOLS = Array.from(
  new Set(SECTOR_SEEDS.flatMap((s) => s.tickers)),
).sort();
