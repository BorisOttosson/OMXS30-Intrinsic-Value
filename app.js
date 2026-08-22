const STORAGE_KEY = "intrinsic-value-omxs30-v1";
// Load the data deployed with this exact site revision. Using raw main here
// can mix a cached page with a newer/older dataset and also breaks local QA.
const RAW_DATA_BASE_URL = "data";
const FUNDAMENTALS_DATA_URL = `${RAW_DATA_BASE_URL}/fundamentals.json`;
const MARKET_DATA_URL = `${RAW_DATA_BASE_URL}/omxs30-data.json`;
const PRICE_DATA_URL = `${RAW_DATA_BASE_URL}/prices.json`;
const MARKETSCREENER_DATA_URL = `${RAW_DATA_BASE_URL}/marketscreener-fcf.json`;
const FX_DATA_URL = `${RAW_DATA_BASE_URL}/fx-rates.json`;
const TARGET_PRICE_DATA_URLS = [
  `${RAW_DATA_BASE_URL}/riktkurser.json`,
  `${RAW_DATA_BASE_URL}/price_targets.json`
];
const LOGO_ASSET_PATH = "assets/logos";
const TARGET_PRICE_ROW_LIMIT = 20;
const CHART_FONT_STACK = 'Futura, "Futura PT", "Avenir Next", Avenir, "Trebuchet MS", sans-serif';
const TARGET_ACTION_TRANSLATIONS = {
  "hojer": "Increasing",
  "sanker": "Decreasing",
  "upprepar": "Reiterates",
  "inleder": "Initiates",
  "aterupptar": "Resumes",
  "justerar": "Adjusts",
  "uppgraderar": "Upgrades",
  "nedgraderar": "Downgrades",
  "satter": "Sets",
  "behaller": "Maintains"
};
const TARGET_RATING_TRANSLATIONS = {
  "kop": "Buy",
  "starkt kop": "Strong Buy",
  "strong buy": "Strong Buy",
  "behall": "Hold",
  "behalla": "Hold",
  "hold": "Hold",
  "neutral": "Neutral",
  "neutralt": "Neutral",
  "salj": "Sell",
  "stark salj": "Strong Sell",
  "strong sell": "Strong Sell",
  "oka": "Accumulate",
  "minska": "Reduce",
  "overvikt": "Overweight",
  "undervikt": "Underweight",
  "outperform": "Outperform",
  "underperform": "Underperform",
  "market perform": "Market Perform",
  "sector perform": "Sector Perform",
  "equal weight": "Equal Weight",
  "jamvikt": "Equal Weight",
  "outperformer": "Outperform",
  "underperformer": "Underperform"
};
const TARGET_DATE_TRANSLATIONS = {
  "idag": "Today",
  "i dag": "Today",
  "igar": "Yesterday",
  "i gar": "Yesterday",
  "forrgar": "2 days ago",
  "i forrgar": "2 days ago",
  "imorgon": "Tomorrow"
};
const SWEDISH_MONTHS = {
  "jan": "Jan",
  "feb": "Feb",
  "mar": "Mar",
  "apr": "Apr",
  "maj": "May",
  "jun": "Jun",
  "jul": "Jul",
  "aug": "Aug",
  "sep": "Sep",
  "okt": "Oct",
  "nov": "Nov",
  "dec": "Dec"
};
const FINANCIAL_TITLE_WORDS = {
  "ev": "EV",
  "ebitda": "EBITDA",
  "fcf": "FCF",
  "pe": "P/E",
  "pb": "P/B",
  "nav": "NAV"
};
const companyCategoryDefinitions = {
  operating: {
    label: "Operating company",
    shortLabel: "Operating",
    model: "DCF + reverse DCF + P/E + EV/EBITDA",
    warning: ""
  },
  bank: {
    label: "Bank",
    shortLabel: "Bank",
    model: "P/B + ROE + P/E",
    warning: "Use P/B, ROE versus cost of equity, and P/E instead of FCF DCF."
  },
  investment: {
    label: "Investment company",
    shortLabel: "Investment",
    model: "NAV discount/premium",
    warning: "Use reported NAV per share and the market discount or premium; operating-company valuation models are not used."
  },
  cyclical: {
    label: "Asset-heavy cyclical",
    shortLabel: "Cyclical",
    model: "Mid-cycle cash-flow DCF + cross-checks",
    warning: "Use a complete-cycle cash-flow history and fade forecasts toward a mid-cycle level."
  }
};

const categoryTickers = {
  bank: new Set(["SHB-A.ST", "NDA-SE.ST", "SEB-A.ST", "SWED-A.ST"]),
  investment: new Set(["EQT.ST", "INDU-C.ST", "INVE-B.ST"]),
  cyclical: new Set(["BOL.ST", "SCA-B.ST", "SKA-B.ST", "SKF-B.ST", "SAND.ST", "VOLV-B.ST"])
};

const companyWordmarks = {
  "ABB.ST": "ABB",
  "ADDT-B.ST": "Addtech",
  "ALFA.ST": "Alfa Laval",
  "ASSA-B.ST": "ASSA ABLOY",
  "AZN.ST": "AstraZeneca",
  "ATCO-A.ST": "Atlas Copco",
  "BOL.ST": "Boliden",
  "EPI-A.ST": "Epiroc",
  "EQT.ST": "EQT",
  "ERIC-B.ST": "ERICSSON",
  "ESSITY-B.ST": "Essity",
  "EVO.ST": "Evolution",
  "SHB-A.ST": "Handelsbanken",
  "HM-B.ST": "H&M",
  "HEXA-B.ST": "Hexagon",
  "INDU-C.ST": "Industrivarden",
  "INVE-B.ST": "investor",
  "LIFCO-B.ST": "Lifco",
  "NIBE-B.ST": "NIBE",
  "NDA-SE.ST": "Nordea",
  "SAAB-B.ST": "SAAB",
  "SAND.ST": "Sandvik",
  "SCA-B.ST": "SCA",
  "SEB-A.ST": "SEB",
  "SKA-B.ST": "Skanska",
  "SKF-B.ST": "SKF",
  "SWED-A.ST": "Swedbank",
  "TEL2-B.ST": "Tele2",
  "TELIA.ST": "Telia",
  "VOLV-B.ST": "VOLVO"
};

const companyLogoFiles = {
  "ABB.ST": "ABB_logo.webp",
  "ADDT-B.ST": "Addtech_logo.webp",
  "ALFA.ST": "AlfaLaval-Logo.svg.webp",
  "ASSA-B.ST": "Assa_Abloy.svg.webp",
  "AZN.ST": "Astrazeneca_text_logo.svg.webp",
  "ATCO-A.ST": "atco-a-st.png",
  "BOL.ST": "Boliden.svg.webp",
  "EPI-A.ST": "Epiroc_logo.svg.webp",
  "EQT.ST": "EQT_(Unternehmen)_logo.svg.webp",
  "ERIC-B.ST": "Ericsson_logo.svg.webp",
  "ESSITY-B.ST": "Essity_Logo_neu.svg.webp",
  "EVO.ST": "Evolution_logo.svg.webp",
  "SHB-A.ST": "Handelsbanken.svg.webp",
  "HM-B.ST": "H&M-Logo.svg.webp",
  "HEXA-B.ST": "Hexagon_AB_Logo_Color.svg.webp",
  "INDU-C.ST": "Industrivärden.svg.webp",
  "INVE-B.ST": "Investor_AB_logo.svg.webp",
  "LIFCO-B.ST": "Lifco_logo.svg.webp",
  "NIBE-B.ST": "Nibe_Industrier_logo.svg.webp",
  "NDA-SE.ST": "Nordea.svg.webp",
  "SAAB-B.ST": "Saab_wordmark_blue.svg.webp",
  "SAND.ST": "SANDVIK.svg.webp",
  "SCA-B.ST": "SCA_company_logo.svg.webp",
  "SEB-A.ST": "SEB-Wordmark-RGB-Black.webp",
  "SKA-B.ST": "Skanska_logo.svg.webp",
  "SKF-B.ST": "SKF-Logo.svg.webp",
  "SWED-A.ST": "Swedbank_wordmark.svg.webp",
  "TEL2-B.ST": "Tele2_logo.svg.webp",
  "TELIA.ST": "Telia_logo_2022.svg.webp",
  "VOLV-B.ST": "Volvo-Spread-Word-Mark-Black.svg.webp"
};

const companyHeroLogoFiles = {
  "ERIC-B.ST": "ericsson-wide.png"
};

const companyHeroLogoFits = {
  "ABB.ST": "restrained",
  "ERIC-B.ST": "wide",
  "HM-B.ST": "restrained",
  "SEB-A.ST": "restrained",
  "TEL2-B.ST": "restrained",
  "TELIA.ST": "restrained"
};

const sectorDefaults = {
  "Industrials": { growth5y: 6.0, consensusGrowth: 5.7, wacc: 8.7, terminalGrowth: 2.2, targetPe: 18, quality: [4, 4, 4] },
  "Financials": { growth5y: 4.1, consensusGrowth: 3.9, wacc: 9.4, terminalGrowth: 1.8, targetPe: 12, quality: [3, 4, 4] },
  "Information Technology": { growth5y: 7.3, consensusGrowth: 7.0, wacc: 9.0, terminalGrowth: 2.4, targetPe: 22, quality: [4, 4, 3] },
  "Health Care": { growth5y: 7.0, consensusGrowth: 6.6, wacc: 8.4, terminalGrowth: 2.5, targetPe: 21, quality: [4, 4, 4] },
  "Consumer Discretionary": { growth5y: 5.2, consensusGrowth: 4.8, wacc: 9.2, terminalGrowth: 2.0, targetPe: 17, quality: [3, 3, 3] },
  "Consumer Staples": { growth5y: 3.6, consensusGrowth: 3.4, wacc: 7.8, terminalGrowth: 1.9, targetPe: 17, quality: [3, 4, 4] },
  "Communication Services": { growth5y: 2.7, consensusGrowth: 2.5, wacc: 8.2, terminalGrowth: 1.4, targetPe: 12, quality: [2, 3, 3] },
  "Materials": { growth5y: 3.8, consensusGrowth: 3.6, wacc: 9.1, terminalGrowth: 1.7, targetPe: 11, quality: [3, 3, 3] }
};

const omxs30Seed = [
  ["ABB.ST", "ABB Ltd", "Industrials"],
  ["ADDT-B.ST", "Addtech B", "Industrials"],
  ["ALFA.ST", "Alfa Laval", "Industrials"],
  ["ASSA-B.ST", "Assa Abloy B", "Industrials"],
  ["AZN.ST", "AstraZeneca", "Health Care"],
  ["ATCO-A.ST", "Atlas Copco A", "Industrials"],
  ["BOL.ST", "Boliden", "Materials"],
  ["EPI-A.ST", "Epiroc A", "Industrials"],
  ["EQT.ST", "EQT", "Financials"],
  ["ERIC-B.ST", "Ericsson B", "Information Technology"],
  ["ESSITY-B.ST", "Essity B", "Consumer Staples"],
  ["EVO.ST", "Evolution", "Consumer Discretionary"],
  ["SHB-A.ST", "Handelsbanken A", "Financials"],
  ["HM-B.ST", "Hennes & Mauritz B", "Consumer Discretionary"],
  ["HEXA-B.ST", "Hexagon B", "Information Technology"],
  ["INDU-C.ST", "Industrivarden C", "Financials"],
  ["INVE-B.ST", "Investor B", "Financials"],
  ["LIFCO-B.ST", "Lifco B", "Industrials"],
  ["NIBE-B.ST", "Nibe Industrier B", "Industrials"],
  ["NDA-SE.ST", "Nordea Bank Abp", "Financials"],
  ["SAAB-B.ST", "Saab B", "Industrials"],
  ["SAND.ST", "Sandvik", "Industrials"],
  ["SCA-B.ST", "SCA B", "Materials"],
  ["SEB-A.ST", "SEB A", "Financials"],
  ["SKA-B.ST", "Skanska B", "Industrials"],
  ["SKF-B.ST", "SKF B", "Industrials"],
  ["SWED-A.ST", "Swedbank A", "Financials"],
  ["TEL2-B.ST", "Tele2 B", "Communication Services"],
  ["TELIA.ST", "Telia Company", "Communication Services"],
  ["VOLV-B.ST", "Volvo B", "Industrials"]
];

const BATCH_SIZE = 10;
const companyBatch = new Map(
  omxs30Seed.map(([ticker], index) => [ticker, Math.floor(index / BATCH_SIZE) + 1])
);
function getCompanyBatch(ticker) {
  return companyBatch.get(ticker) ?? Infinity;
}

const scenarioAdjustments = {
  base: { label: "Base case", growth: 0, wacc: 0, targetPe: 0 },
  bear: { label: "Bear case", growth: -2.0, wacc: 1.0, targetPe: -2.0 },
  bull: { label: "Bull case", growth: 2.0, wacc: -0.7, targetPe: 2.0 }
};

let state = {
  companies: loadCompanies(),
  selectedId: null,
  scenario: "base",
  analysisModel: "dcf",
  growthAssumption: loadGrowthAssumptionPreference(),
  marketData: {
    fundamentalsLoaded: false,
    pricesLoaded: false,
    targetPricesLoaded: false,
    status: "Sample inputs",
    fundamentalsGeneratedAt: null,
    pricesGeneratedAt: null,
    targetPricesGeneratedAt: null,
    fundamentalsProvider: null,
    pricesProvider: null,
    targetPricesProvider: null,
    errors: []
  },
  filters: {
    search: "",
    sector: "all",
    companyType: "all",
    stance: "all"
  }
};

state.selectedId = state.companies[0]?.id ?? null;

const elements = {
  companyList: document.querySelector("#companyList"),
  sectorFilter: document.querySelector("#sectorFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  stanceFilter: document.querySelector("#stanceFilter"),
  searchInput: document.querySelector("#searchInput"),
  valuationForm: document.querySelector("#valuationForm"),
  selectedTicker: document.querySelector("#selectedTicker"),
  selectedLogoImage: document.querySelector("#selectedLogoImage"),
  selectedLogo: document.querySelector("#selectedLogo"),
  selectedName: document.querySelector("#selectedName"),
  selectedMeta: document.querySelector("#selectedMeta"),
  inputBadge: document.querySelector("#inputBadge"),
  stanceBadge: document.querySelector("#stanceBadge"),
  metricValue: document.querySelector("#metricValue"),
  metricValueSub: document.querySelector("#metricValueSub"),
  heroCurrentPrice: document.querySelector("#heroCurrentPrice"),
  metricMos: document.querySelector("#metricMos"),
  metricMosSub: document.querySelector("#metricMosSub"),
  metricReverseLabel: document.querySelector("#metricReverseLabel"),
  metricReverse: document.querySelector("#metricReverse"),
  metricReverseSub: document.querySelector("#metricReverseSub"),
  metricScore: document.querySelector("#metricScore"),
  metricScoreSub: document.querySelector("#metricScoreSub"),
  valuationPrimaryLabel: document.querySelector("#valuationPrimaryLabel"),
  valuationSecondaryLabel: document.querySelector("#valuationSecondaryLabel"),
  valuationTertiaryLabel: document.querySelector("#valuationTertiaryLabel"),
  valuationPrimarySub: document.querySelector("#valuationPrimarySub"),
  valuationSecondarySub: document.querySelector("#valuationSecondarySub"),
  valuationTertiarySub: document.querySelector("#valuationTertiarySub"),
  valuationFourthLabel: document.querySelector("#valuationFourthLabel"),
  valuationFourthValue: document.querySelector("#valuationFourthValue"),
  valuationFourthSub: document.querySelector("#valuationFourthSub"),
  dcfValue: document.querySelector("#dcfValue"),
  peValue: document.querySelector("#peValue"),
  currentPe: document.querySelector("#currentPe"),
  analysisPanel: document.querySelector("#analysisPanel"),
  analysisPanelTitle: document.querySelector("#analysisPanelTitle"),
  analysisControls: document.querySelector("#analysisControls"),
  scenarioGuide: document.querySelector("#scenarioGuide"),
  analysisMetricsTitle: document.querySelector("#analysisMetricsTitle"),
  analysisMetricsNote: document.querySelector("#analysisMetricsNote"),
  analysisChartTitle: document.querySelector("#analysisChartTitle"),
  analysisChartSubtitle: document.querySelector("#analysisChartSubtitle"),
  analysisChartUnit: document.querySelector("#analysisChartUnit"),
  analysisModelTitle: document.querySelector("#analysisModelTitle"),
  analysisModelDescription: document.querySelector("#analysisModelDescription"),
  analysisFormula: document.querySelector("#analysisFormula"),
  analysisAssumptions: document.querySelector("#analysisAssumptions"),
  cyclicalAudit: document.querySelector("#cyclicalAudit"),
  cyclicalAuditStatus: document.querySelector("#cyclicalAuditStatus"),
  specializedCyclicalAudit: document.querySelector("#specializedCyclicalAudit"),
  genericCyclicalAudit: document.querySelector("#genericCyclicalAudit"),
  cyclicalSteps: document.querySelector("#cyclicalSteps"),
  cyclicalSourceLink: document.querySelector("#cyclicalSourceLink"),
  cyclicalHistoryRows: document.querySelector("#cyclicalHistoryRows"),
  cyclicalNormalizationFormula: document.querySelector("#cyclicalNormalizationFormula"),
  cyclicalForecastRows: document.querySelector("#cyclicalForecastRows"),
  cyclicalValueBridge: document.querySelector("#cyclicalValueBridge"),
  cyclicalPrimaryValue: document.querySelector("#cyclicalPrimaryValue"),
  cyclicalEbitdaCheck: document.querySelector("#cyclicalEbitdaCheck"),
  cyclicalEbitdaNote: document.querySelector("#cyclicalEbitdaNote"),
  cyclicalPeCheck: document.querySelector("#cyclicalPeCheck"),
  cyclicalPeNote: document.querySelector("#cyclicalPeNote"),
  cyclicalSubtype: document.querySelector("#cyclicalSubtype"),
  cyclicalSubtypeNote: document.querySelector("#cyclicalSubtypeNote"),
  scenarioBaseCopy: document.querySelector("#scenarioBaseCopy"),
  scenarioBullCopy: document.querySelector("#scenarioBullCopy"),
  scenarioBearCopy: document.querySelector("#scenarioBearCopy"),
  riktkursSummary: document.querySelector("#riktkursSummary"),
  riktkursTarget: document.querySelector("#riktkursTarget"),
  riktkursUpside: document.querySelector("#riktkursUpside"),
  riktkursConsensus: document.querySelector("#riktkursConsensus"),
  riktkursCount: document.querySelector("#riktkursCount"),
  riktkursLatest: document.querySelector("#riktkursLatest"),
  riktkursSource: document.querySelector("#riktkursSource"),
  dcfChart: document.querySelector("#dcfChart"),
  dataStatus: document.querySelector("#dataStatus"),
  dataTimestamp: document.querySelector("#dataTimestamp"),
  syntheticPortfolio: document.querySelector("#syntheticPortfolio"),
  syntheticSummary: document.querySelector("#syntheticSummary"),
  syntheticCount: document.querySelector("#syntheticCount"),
  fundamentalsSubtitle: document.querySelector("#fundamentalsSubtitle"),
  fundamentalsSourceLink: document.querySelector("#fundamentalsSourceLink"),
  fundMarketCap: document.querySelector("#fundMarketCap"),
  fundRevenueLabel: document.querySelector("#fundRevenueLabel"),
  fundRevenue: document.querySelector("#fundRevenue"),
  fundEbitdaLabel: document.querySelector("#fundEbitdaLabel"),
  fundEbitda: document.querySelector("#fundEbitda"),
  fundFcfLabel: document.querySelector("#fundFcfLabel"),
  fundFcf: document.querySelector("#fundFcf"),
  fundAssetsLabel: document.querySelector("#fundAssetsLabel"),
  fundAssets: document.querySelector("#fundAssets"),
  fundEquityLabel: document.querySelector("#fundEquityLabel"),
  fundEquity: document.querySelector("#fundEquity"),
  fundLiabilitiesLabel: document.querySelector("#fundLiabilitiesLabel"),
  fundLiabilities: document.querySelector("#fundLiabilities"),
  fundDebtLabel: document.querySelector("#fundDebtLabel"),
  fundDebt: document.querySelector("#fundDebt"),
  fundCashLabel: document.querySelector("#fundCashLabel"),
  fundCash: document.querySelector("#fundCash"),
  fundShares: document.querySelector("#fundShares"),
  fundSharesLabel: document.querySelector("#fundSharesLabel"),
  fundEvEbitda: document.querySelector("#fundEvEbitda"),
  fundFcfYield: document.querySelector("#fundFcfYield"),
  ebitdaAuditSummary: document.querySelector("#ebitdaAuditSummary"),
  ebitdaAuditBody: document.querySelector("#ebitdaAuditBody"),
  fcfAuditSummary: document.querySelector("#fcfAuditSummary"),
  fcfAuditBody: document.querySelector("#fcfAuditBody"),
  footerDataNote: document.querySelector("#footerDataNote"),
  tickerSnapshot: document.querySelector("#tickerSnapshot"),
  tickerSource: document.querySelector("#tickerSource"),
  resetSelectedBtn: document.querySelector("#resetSelectedBtn"),
  resetAllBtn: document.querySelector("#resetAllBtn"),
  toast: document.querySelector("#toast")
};

function createDefaultCompanies() {
  return omxs30Seed.map(([ticker, name, sector], index) => {
    const defaults = sectorDefaults[sector];
    const category = getCompanyType(ticker);
    const price = round(58 + (index % 9) * 28 + Math.floor(index / 3) * 11 + (sector.length % 5) * 9, 2);
    const peAnchor = defaults.targetPe * (0.86 + (index % 5) * 0.045);
    const eps = round(price / peAnchor, 2);
    const fcfPerShare = round(eps * (0.76 + (index % 4) * 0.08), 2);
    const ebitdaPerShare = round(eps * (1.55 + (index % 4) * 0.12), 2);
    const debt = sector === "Financials" ? 0 : round(((index % 7) - 3) * 1.65, 2);
    const [industryScore, companyScore, leadershipScore] = defaults.quality;
    const bookValuePerShare = category === "bank"
      ? round(price / 1.15, 2)
      : (category === "investment" ? round(price * 1.12, 2) : round(price * 0.42, 2));
    const roe = category === "bank"
      ? round(12.5 + (index % 4) * 0.6, 1)
      : round((eps / Math.max(bookValuePerShare, 1)) * 100, 1);
    const normalizedFcfPerShare = category === "cyclical" ? round(fcfPerShare * 1.12, 2) : fcfPerShare;
    const normalizedEbitdaPerShare = category === "cyclical" ? round(ebitdaPerShare * 1.08, 2) : ebitdaPerShare;
    const targetEvToEbitda = category === "bank" || category === "investment"
      ? 0
      : round(9.5 + (index % 5) * 0.6, 1);

    return {
      id: ticker.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      ticker,
      name,
      sector,
      companyType: category,
      marketPrice: price,
      fcfPerShare,
      ebitdaPerShare,
      eps,
      netDebtPerShare: debt,
      bookValuePerShare,
      roe,
      normalizedFcfPerShare,
      normalizedEbitdaPerShare,
      growth5y: round(defaults.growth5y + ((index % 5) - 2) * 0.35, 1),
      dcfGrowth: null,
      consensusGrowth: null,
      consensusGrowthSource: null,
      consensusGrowthAsOf: null,
      consensusGrowthAudit: { valid: false, reason: "Waiting for verified MarketScreener forecast data" },
      consensusEpsAudit: { valid: false, reason: "Waiting for verified MarketScreener EPS estimates" },
      growth5yYears: null,
      fcfSeries: null,
      growth5ySource: null,
      growth5yUpdatedAt: null,
      wacc: round(defaults.wacc + ((index % 3) - 1) * 0.25, 1),
      terminalGrowth: defaults.terminalGrowth,
      targetPe: round(price / eps, 2),
      targetEvToEbitda,
      portfolioWeight: 0,
      industryScore,
      companyScore: clamp(companyScore + ((index % 3) - 1), 1, 5),
      leadershipScore: clamp(leadershipScore + ((index % 4) === 0 ? 1 : 0), 1, 5),
      notes: "",
      source: "Sample input",
      currency: "SEK",
      dataUpdatedAt: null,
      fundamentals: {},
      targetPriceData: null
    };
  });
}

function loadCompanies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultCompanies();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.companies)) return createDefaultCompanies();
    return mergeWithSeed(parsed.companies);
  } catch {
    return createDefaultCompanies();
  }
}

function loadGrowthAssumptionPreference() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed?.growthAssumption === "consensus" ? "consensus" : "cagr";
  } catch {
    return "cagr";
  }
}

function mergeWithSeed(savedCompanies) {
  const defaults = createDefaultCompanies();
  const savedById = new Map(savedCompanies.map((company) => [company.id, company]));
  return defaults.map((company) => {
    const saved = savedById.get(company.id) ?? {};
    const merged = {
      ...company,
      ...saved,
      companyType: normalizeCompanyType(saved.companyType, company.ticker),
      dcfGrowth: numberOrNull(saved.dcfGrowth),
      consensusGrowth: null,
      consensusGrowthSource: null,
      consensusGrowthAsOf: null,
      consensusGrowthAudit: { valid: false, reason: "Waiting for verified MarketScreener forecast data" },
      consensusEpsAudit: { valid: false, reason: "Waiting for verified MarketScreener EPS estimates" }
    };
    merged.targetPe = getCurrentPeRatio(merged);
    return merged;
  });
}

function saveCompanies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 2,
    updatedAt: new Date().toISOString(),
    growthAssumption: state.growthAssumption,
    companies: state.companies
  }, null, 2));
}

async function loadMarketData({ quiet = true } = {}) {
  const nextMarketData = {
    fundamentalsLoaded: false,
    pricesLoaded: false,
    targetPricesLoaded: false,
    status: "Sample or saved inputs",
    fundamentalsGeneratedAt: null,
    pricesGeneratedAt: null,
    targetPricesGeneratedAt: null,
    fundamentalsProvider: null,
    pricesProvider: null,
    targetPricesProvider: null,
    errors: []
  };
  let changed = false;

  try {
    const payload = await fetchFirstJson([
      FUNDAMENTALS_DATA_URL,
      MARKET_DATA_URL
    ]);
    if (!Array.isArray(payload?.companies)) throw new Error("Missing companies");

    state.companies = applyMarketData(state.companies, payload.companies);
    nextMarketData.fundamentalsLoaded = true;
    nextMarketData.fundamentalsGeneratedAt = payload.generatedAt ?? null;
    nextMarketData.fundamentalsProvider = payload.provider ?? "Official company reports";
    nextMarketData.errors.push(...payload.companies.flatMap((company) => company.errors ?? []));
    changed = true;
  } catch (error) {
    nextMarketData.errors.push(`fundamentals: ${String(error?.message ?? error)}`);
  }

  try {
    const response = await fetch(`${PRICE_DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.companies)) throw new Error("Missing prices");

    state.companies = applyPriceData(state.companies, payload.companies);
    nextMarketData.pricesLoaded = true;
    nextMarketData.pricesGeneratedAt = payload.generatedAt ?? null;
    nextMarketData.pricesProvider = payload.provider ?? "Yahoo Finance via yfinance prices";
    nextMarketData.errors.push(...payload.companies.flatMap((company) => company.errors ?? []));
    changed = true;
  } catch (error) {
    nextMarketData.errors.push(`prices: ${String(error?.message ?? error)}`);
  }

  try {
    const targetPricePayloads = [];
    const targetPriceErrors = [];
    for (const url of TARGET_PRICE_DATA_URLS) {
      try {
        const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload?.companies)) throw new Error("Missing target prices");
        targetPricePayloads.push(payload);
      } catch (error) {
        targetPriceErrors.push(`${url.split("/").pop()}: ${String(error?.message ?? error)}`);
      }
    }
    if (!targetPricePayloads.length) throw new Error(targetPriceErrors.join("; "));
    const payload = targetPricePayloads.sort((first, second) => {
      const firstTime = Date.parse(first.generatedAt ?? "") || 0;
      const secondTime = Date.parse(second.generatedAt ?? "") || 0;
      return secondTime - firstTime;
    })[0];

    state.companies = applyTargetPriceData(state.companies, payload.companies);
    nextMarketData.targetPricesLoaded = true;
    nextMarketData.targetPricesGeneratedAt = payload.generatedAt ?? null;
    nextMarketData.targetPricesProvider = payload.provider ?? "Börskollen target prices";
    nextMarketData.errors.push(...payload.companies.flatMap((company) => company.errors ?? []));
    changed = true;
  } catch (error) {
    nextMarketData.errors.push(`target prices: ${String(error?.message ?? error)}`);
  }

  nextMarketData.status = getDataStatusLabel(nextMarketData);
  state.marketData = nextMarketData;

  if (changed) {
    saveCompanies();
    renderAll();
    if (!quiet) showToast("Market data reloaded");
    return;
  }

  renderDataStatus();
  if (!quiet) showToast("No market data files found");
}

async function fetchFirstJson(urls) {
  const errors = [];

  for (const url of urls) {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      errors.push(`${url.split("/").pop()}: ${String(error?.message ?? error)}`);
    }
  }

  throw new Error(errors.join(" | "));
}

function applyMarketData(currentCompanies, marketCompanies) {
  const currentById = new Map(currentCompanies.map((company) => [company.id, company]));
  const marketById = new Map(marketCompanies.map((company) => [company.id, company]));

  return createDefaultCompanies().map((seedCompany) => {
    const current = currentById.get(seedCompany.id) ?? {};
    const market = marketById.get(seedCompany.id) ?? {};
    const fundamentals = {
      previousClose: numberOrNull(market.previousClose),
      marketCap: numberOrNull(market.marketCap),
      sharesOutstanding: numberOrNull(market.sharesOutstanding),
      sharesOutstandingSource: market.sharesOutstandingSource ?? null,
      totalRevenue: numberOrNull(market.totalRevenue),
      ebitda: numberOrNull(market.ebitda),
      ebit: numberOrNull(market.ebit),
      netIncome: numberOrNull(market.netIncome),
      operatingCashFlow: numberOrNull(market.operatingCashFlow),
      cashFlowMetricLabel: market.cashFlowMetricLabel ?? null,
      capitalExpenditures: numberOrNull(market.capitalExpenditures),
      freeCashFlow: numberOrNull(market.freeCashFlow),
      totalAssets: numberOrNull(market.totalAssets),
      totalLiabilities: numberOrNull(market.totalLiabilities),
      bookEquity: numberOrNull(market.bookEquity),
      totalDebt: numberOrNull(market.totalDebt),
      cash: numberOrNull(market.cash),
      netDebt: numberOrNull(market.netDebt),
      enterpriseValue: numberOrNull(market.enterpriseValue),
      evToEbitda: numberOrNull(market.evToEbitda),
      fcfYield: numberOrNull(market.fcfYield),
      equityPerShare: numberOrNull(market.equityPerShare),
      liabilitiesPerShare: numberOrNull(market.liabilitiesPerShare),
      trailingPe: numberOrNull(current.fundamentals?.trailingPe) ?? numberOrNull(market.trailingPe),
      forwardPe: numberOrNull(market.forwardPe),
      trailingEps: numberOrNull(market.trailingEps) ?? numberOrNull(current.fundamentals?.trailingEps),
      trailingPeSource: market.trailingPeSource ?? current.fundamentals?.trailingPeSource ?? null,
      trailingPeUpdatedAt: market.trailingPeUpdatedAt ?? current.fundamentals?.trailingPeUpdatedAt ?? null,
      analystTargetMeanPrice: numberOrNull(market.analystTargetMeanPrice),
      recommendationMean: numberOrNull(market.recommendationMean),
      roe: numberOrNull(market.roe),
      normalizedFcfPerShare: numberOrNull(market.normalizedFcfPerShare),
      normalizedEbitdaPerShare: numberOrNull(market.normalizedEbitdaPerShare),
      financialCurrency: market.financialCurrency ?? null,
      financialToQuoteFx: numberOrNull(market.financialToQuoteFx),
      latestFiscalDate: market.latestFiscalDate ?? null,
      incomeStatementDate: market.incomeStatementDate ?? null,
      incomeStatementPeriod: market.incomeStatementPeriod ?? null,
      balanceSheetDate: market.balanceSheetDate ?? null,
      balanceSheetPeriod: market.balanceSheetPeriod ?? null,
      cashFlowStatementDate: market.cashFlowStatementDate ?? null,
      cashFlowStatementPeriod: market.cashFlowStatementPeriod ?? null,
      metricCalculations: market.metricCalculations ?? null,
      independentVerification: market.independentVerification ?? null,
      officialSource: market.officialSource ?? null,
      dataQuality: market.dataQuality ?? null,
      errors: market.errors ?? []
    };

    const marketBookValue = market.bookValuePerShare ?? market.equityPerShare;
    const fundamentalsUsable = market.dataQuality?.valuationReady !== false;
    const fundamentalInput = (value) => fundamentalsUsable ? numberOrNull(value) : null;

    const resolvedMarketPrice = numberOrFallback(market.marketPrice, current.marketPrice ?? seedCompany.marketPrice);
    const resolvedEps = fundamentalInput(market.eps);
    const currentPe = getCurrentPeRatio({
      marketPrice: resolvedMarketPrice,
      eps: resolvedEps,
      fundamentals
    });

    return {
      ...seedCompany,
      ...current,
      companyType: normalizeCompanyType(market.companyType ?? current.companyType, seedCompany.ticker),
      marketPrice: resolvedMarketPrice,
      fcfPerShare: fundamentalInput(market.fcfPerShare),
      ebitdaPerShare: fundamentalInput(market.ebitdaPerShare),
      eps: resolvedEps,
      netDebtPerShare: fundamentalInput(market.netDebtPerShare),
      bookValuePerShare: numberOrFallback(marketBookValue, current.bookValuePerShare ?? seedCompany.bookValuePerShare),
      navPerShare: numberOrFallback(market.navPerShare, current.navPerShare ?? seedCompany.navPerShare),
      roe: numberOrFallback(market.roe, current.roe ?? seedCompany.roe),
      // Normalized values must be explicitly supported by the loaded report data.
      // Never fall back to generated sample values for a real company.
      normalizedFcfPerShare: fundamentalInput(market.normalizedFcfPerShare),
      normalizedEbitdaPerShare: fundamentalInput(market.normalizedEbitdaPerShare),
      normalizedEpsPerShare: fundamentalInput(market.normalizedEpsPerShare),
      specializedValuation: market.specializedValuation ?? current.specializedValuation ?? null,
      // Historical 5yr FCF CAGR - always auto, computed by the data pipeline.
      growth5y: fundamentalInput(market.growth5y),
      growth5yYears: market.growth5yYears ?? current.growth5yYears ?? null,
      fcfSeries: market.fcfSeries ?? current.fcfSeries ?? seedCompany.fcfSeries ?? null,
      fcfHistory: market.fcfHistory ?? current.fcfHistory ?? seedCompany.fcfHistory ?? null,
      growth5ySource: market.growth5ySource ?? current.growth5ySource ?? null,
      growth5ySourceUrl: market.growth5ySourceUrl ?? current.growth5ySourceUrl ?? null,
      growth5yUpdatedAt: market.growth5yUpdatedAt ?? market.dataUpdatedAt ?? current.growth5yUpdatedAt ?? null,
      dcfGrowth: numberOrNull(current.dcfGrowth),
      // Populated only from the traceable MarketScreener FCF forecast below.
      consensusGrowth: null,
      consensusGrowthSource: null,
      consensusGrowthAsOf: null,
      consensusGrowthAudit: { valid: false, reason: "Waiting for verified MarketScreener forecast data" },
      consensusEpsAudit: { valid: false, reason: "Waiting for verified MarketScreener EPS estimates" },
      // Base-case target P/E is always anchored to the current trailing P/E
      // displayed beside the share price.
      targetPe: currentPe,
      targetEvToEbitda: numberOrFallback(market.targetEvToEbitda, current.targetEvToEbitda ?? seedCompany.targetEvToEbitda),
      currency: market.currency ?? current.currency ?? "SEK",
      dataUpdatedAt: market.dataUpdatedAt ?? current.dataUpdatedAt ?? null,
      fundamentalsUsable,
      dataQuality: market.dataQuality ?? null,
      source: market.source ? `${market.source} + manual assumptions` : (current.source ?? seedCompany.source),
      independentVerification: market.independentVerification ?? null,
      officialSource: market.officialSource ?? null,
      notes: current.notes ?? seedCompany.notes,
      targetPriceData: current.targetPriceData ?? seedCompany.targetPriceData,
      wacc: numberOrFallback(market.wacc, current.wacc ?? seedCompany.wacc),
      terminalGrowth: numberOrFallback(market.terminalGrowth, current.terminalGrowth ?? seedCompany.terminalGrowth),
      portfolioWeight: current.portfolioWeight ?? seedCompany.portfolioWeight,
      industryScore: numberOrFallback(market.industryScore, current.industryScore ?? seedCompany.industryScore),
      companyScore: numberOrFallback(market.companyScore, current.companyScore ?? seedCompany.companyScore),
      leadershipScore: numberOrFallback(market.leadershipScore, current.leadershipScore ?? seedCompany.leadershipScore),
      fundamentals
    };
  });
}

function applyTargetPriceData(currentCompanies, targetCompanies) {
  const targetById = new Map(targetCompanies.map((company) => [company.id, company]));
  const targetByTicker = new Map(targetCompanies.map((company) => [company.ticker, company]));

  return currentCompanies.map((company) => {
    const target = targetById.get(company.id) ?? targetByTicker.get(company.ticker);
    if (!target) return company;

    return {
      ...company,
      targetPriceData: {
        targetPrice: numberOrNull(target.targetPrice),
        upsidePercent: numberOrNull(target.upsidePercent),
        consensus: target.consensus ?? null,
        targetCount: Number.isFinite(Number(target.targetCount)) ? Number(target.targetCount) : null,
        latest: Array.isArray(target.latest) ? target.latest.slice(0, TARGET_PRICE_ROW_LIMIT) : [],
        sourceUrl: target.sourceUrl ?? null,
        dataUpdatedAt: target.dataUpdatedAt ?? null,
        errors: Array.isArray(target.errors) ? target.errors : []
      }
    };
  });
}

function applyPriceData(currentCompanies, priceCompanies) {
  const priceById = new Map(priceCompanies.map((company) => [company.id, company]));

  return currentCompanies.map((company) => {
    const price = priceById.get(company.id) ?? priceById.get(company.ticker);
    const marketPrice = numberOrNull(price?.marketPrice);
    if (marketPrice === null) return company;
    const existingFundamentals = company.fundamentals ?? {};
    const trailingEps = numberOrNull(price.trailingEps) ?? numberOrNull(existingFundamentals.trailingEps);
    const providerTrailingPe = numberOrNull(price.trailingPe);
    const pricePayloadHasPe = Object.prototype.hasOwnProperty.call(price, "trailingPe");
    const sharesOutstanding = numberOrNull(existingFundamentals.sharesOutstanding);
    const marketCap = sharesOutstanding !== null
      ? marketPrice * sharesOutstanding
      : numberOrNull(existingFundamentals.marketCap);
    const netDebt = numberOrNull(existingFundamentals.netDebt);
    const enterpriseValue = marketCap !== null && netDebt !== null
      ? marketCap + netDebt
      : numberOrNull(existingFundamentals.enterpriseValue);
    const ebitda = numberOrNull(existingFundamentals.ebitda);
    const evToEbitda = enterpriseValue !== null && ebitda !== null && ebitda > 0
      ? enterpriseValue / ebitda
      : numberOrNull(existingFundamentals.evToEbitda);
    const freeCashFlow = numberOrNull(existingFundamentals.freeCashFlow);
    const fcfYield = marketCap !== null && freeCashFlow !== null && marketCap > 0
      ? (freeCashFlow / marketCap) * 100
      : numberOrNull(existingFundamentals.fcfYield);
    const currentPe = providerTrailingPe !== null && providerTrailingPe > 0
      ? providerTrailingPe
      : (trailingEps !== null && trailingEps > 0
        ? marketPrice / trailingEps
        : getCurrentPeRatio({ ...company, marketPrice }));

    return {
      ...company,
      marketPrice,
      targetPe: currentPe,
      currency: price.currency ?? company.currency ?? "SEK",
      priceSource: price.source ?? "Yahoo Finance",
      priceUpdatedAt: price.priceUpdatedAt ?? price.dataUpdatedAt ?? null,
      fundamentals: {
        ...existingFundamentals,
        marketCap,
        enterpriseValue,
        evToEbitda,
        fcfYield,
        trailingEps,
        trailingPe: pricePayloadHasPe
          ? (providerTrailingPe !== null && providerTrailingPe > 0 ? providerTrailingPe : null)
          : numberOrNull(existingFundamentals.trailingPe),
        trailingPeSource: price.peSource ?? existingFundamentals.trailingPeSource ?? null,
        trailingPeUpdatedAt: price.peUpdatedAt ?? price.priceUpdatedAt ?? existingFundamentals.trailingPeUpdatedAt ?? null,
        previousClose: numberOrNull(price.previousClose) ?? numberOrNull(existingFundamentals.previousClose)
      }
    };
  });
}

function getSelectedCompany() {
  return state.companies.find((company) => company.id === state.selectedId) ?? state.companies[0];
}

function getCurrentPeRatio(company) {
  return getDisplayTrailingPe(company);
}

function getCompanyType(ticker) {
  if (categoryTickers.bank.has(ticker)) return "bank";
  if (categoryTickers.investment.has(ticker)) return "investment";
  if (categoryTickers.cyclical.has(ticker)) return "cyclical";
  return "operating";
}

function normalizeCompanyType(companyType, ticker) {
  if (companyType === "producer") return getCompanyType(ticker);
  if (companyCategoryDefinitions[companyType]) return companyType;
  return getCompanyType(ticker);
}

function getCompanyTypeLabel(companyType) {
  return companyCategoryDefinitions[companyType]?.label ?? companyCategoryDefinitions.operating.label;
}

function getCompanyTypeShortLabel(companyType) {
  return companyCategoryDefinitions[companyType]?.shortLabel ?? companyCategoryDefinitions.operating.shortLabel;
}

function getCompanyModelLabel(companyType) {
  return companyCategoryDefinitions[companyType]?.model ?? companyCategoryDefinitions.operating.model;
}

function getCompanyModelWarning(companyType) {
  return companyCategoryDefinitions[companyType]?.warning ?? "";
}

function getCompanySourceLabel(company) {
  const parts = [];
  if (company.priceSource) parts.push(`${company.priceSource} prices`);
  if (company.source && company.source !== "Sample input") {
    const source = company.source.replace(" + manual assumptions", "");
    parts.push(source.includes("fundamentals") ? source : `${source} fundamentals`);
  }
  return parts.join(" | ") || "Sample input";
}

function getCompanyWordmark(company) {
  return companyWordmarks[company.ticker] ?? company.name;
}

function getCompanyLogoFileName(company) {
  return companyLogoFiles[company.ticker] ?? `${company.id}.webp`;
}

function getCompanyLogoUrl(company) {
  return `${LOGO_ASSET_PATH}/${getCompanyLogoFileName(company)}`;
}

function getCompanyHeroLogoFileName(company) {
  return companyHeroLogoFiles[company.ticker] ?? getCompanyLogoFileName(company);
}

function getCompanyHeroLogoUrl(company) {
  return `${LOGO_ASSET_PATH}/${getCompanyHeroLogoFileName(company)}`;
}

function getCompanyLogoFallbackUrl(company) {
  return `${LOGO_ASSET_PATH}/${company.id}.png`;
}

function getCompanyLogoFit(company) {
  return "large-wordmark";
}

function getCompanyHeroLogoFit(company) {
  return companyHeroLogoFits[company.ticker] ?? "standard";
}

function logoImageMarkup(company, className) {
  const logoUrl = getCompanyLogoUrl(company);
  if (!logoUrl) return "";
  return `<img class="${className}" src="${escapeHtml(logoUrl)}" data-logo-fit="${escapeHtml(getCompanyLogoFit(company))}" data-fallback-logo="${escapeHtml(getCompanyLogoFallbackUrl(company))}" alt="${escapeHtml(company.name)} logo" loading="lazy" decoding="async" onload="handleLogoLoad(event)" onerror="handleLogoError(event)">`;
}

function handleLogoLoad(event) {
  const image = event.currentTarget;
  image.hidden = false;
  image.closest(".company-logo-mark, .selected-logo-image-wrap")?.classList.remove("is-missing");
  image.closest(".company-row")?.classList.remove("logo-missing");
}

function handleLogoError(event) {
  const image = event.currentTarget;
  const fallbackLogo = image.dataset.fallbackLogo;
  if (fallbackLogo && image.dataset.usedFallback !== "true") {
    image.dataset.usedFallback = "true";
    image.src = fallbackLogo;
    return;
  }

  image.hidden = true;
  image.closest(".company-logo-mark, .selected-logo-image-wrap")?.classList.add("is-missing");
  image.closest(".company-row")?.classList.add("logo-missing");
}

window.handleLogoLoad = handleLogoLoad;
window.handleLogoError = handleLogoError;

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrFallback(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((asNumber(value) + Number.EPSILON) * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatSek(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString("sv-SE")} SEK`;
}

function formatPriceNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString("sv-SE");
}

function getDisplayTrailingPe(company) {
  const stored = numberOrNull(company?.fundamentals?.trailingPe);
  if (stored !== null && stored > 0 && stored < 1000) return stored;
  const price = numberOrNull(company?.marketPrice);
  const eps = numberOrNull(company?.fundamentals?.trailingEps) ?? numberOrNull(company?.eps);
  if (price !== null && price > 0 && eps !== null && eps > 0) return price / eps;
  return null;
}

function formatTickerMoney(value, currency = "SEK") {
  if (!Number.isFinite(value)) return "-";
  return `${formatPriceNumber(value)} ${currency}`;
}

function formatPerShareMoney(value, currency = "SEK", digits = 2) {
  if (!Number.isFinite(value)) return "-";
  return `${formatDecimal(value, digits)} ${currency}`;
}

function formatCurrency(value, currency = "SEK") {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000) return `${sign}${formatDecimal(abs / 1_000_000_000_000, 1)} tn ${currency}`;
  if (abs >= 1_000_000_000) return `${sign}${formatDecimal(abs / 1_000_000_000, 1)} bn ${currency}`;
  if (abs >= 1_000_000) return `${sign}${formatDecimal(abs / 1_000_000, 1)} mn ${currency}`;
  return `${sign}${Math.round(abs).toLocaleString("sv-SE")} ${currency}`;
}

function formatShares(value) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 1_000_000_000) return `${formatDecimal(value / 1_000_000_000, 2)} bn`;
  if (value >= 1_000_000) return `${formatDecimal(value / 1_000_000, 1)} mn`;
  return Math.round(value).toLocaleString("sv-SE");
}

function formatDecimal(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value, digits)}%`;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) return null;
  return date.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) return null;
  return date.toLocaleDateString("sv-SE");
}

function formatReportPeriod(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const normalized = text.replace(/[_-]/g, " ").replace(/\s+/g, " ");
  const isTtm = /\b(?:TTM|TRAILING|ROLLING\s*12)\b/i.test(normalized);
  const yearQuarter = normalized.match(/\b(\d{4})\s*Q([1-4])\b/i);
  if (yearQuarter) {
    const quarter = `Q${yearQuarter[2]} ${yearQuarter[1]}`;
    return isTtm ? `TTM through ${quarter}` : quarter;
  }
  const quarterYear = normalized.match(/\bQ([1-4])\s*(\d{4})\b/i);
  if (quarterYear) {
    const quarter = `Q${quarterYear[1]} ${quarterYear[2]}`;
    return isTtm ? `TTM through ${quarter}` : quarter;
  }
  if (/^\d{4}$/.test(normalized)) {
    return isTtm ? `TTM through ${normalized}` : normalized;
  }
  return normalized;
}

function formatStatementReference(label, period, date) {
  let periodText = formatReportPeriod(period);
  const dateText = formatDate(date);
  const reportDate = date ? new Date(date) : null;

  if (periodText && !/\d{4}/.test(periodText) && reportDate && !Number.isNaN(reportDate.valueOf())) {
    periodText = `${periodText} ${reportDate.getFullYear()}`;
  }

  if (periodText && dateText && !periodText.includes(dateText)) {
    return `${label}: ${periodText} (${dateText})`;
  }

  if (periodText) return `${label}: ${periodText}`;
  if (dateText) return `${label}: ${dateText}`;
  return null;
}

function normalizeTargetLabel(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[|]/g, " ")
    .replace(/[^a-z0-9+/\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseFinancial(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "-";
  return text
    .split(" ")
    .map((word) => {
      const normalized = normalizeTargetLabel(word);
      if (FINANCIAL_TITLE_WORDS[normalized]) return FINANCIAL_TITLE_WORDS[normalized];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function translateTargetLabel(value, dictionary, fallback = "-") {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return fallback;

  const normalized = normalizeTargetLabel(raw);
  if (dictionary[normalized]) return dictionary[normalized];

  const match = Object.entries(dictionary)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([key]) => normalized === key || normalized.startsWith(`${key} `) || normalized.endsWith(` ${key}`) || normalized.includes(` ${key} `));

  return match ? match[1] : titleCaseFinancial(raw);
}

function translateTargetDate(value) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "-";

  const normalized = normalizeTargetLabel(raw);
  if (TARGET_DATE_TRANSLATIONS[normalized]) return TARGET_DATE_TRANSLATIONS[normalized];

  const relative = normalized.match(/^(\d+)\s*(?:dagar|dag|d)\s*sedan$/);
  if (relative) {
    const days = Number(relative[1]);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const dayMonth = normalized.match(/^(\d{1,2})\s+([a-z]{3,})\.?(?:\s+(\d{4}))?$/);
  if (dayMonth) {
    const month = SWEDISH_MONTHS[dayMonth[2].slice(0, 3)];
    if (month) {
      return dayMonth[3] ? `${month} ${Number(dayMonth[1])}, ${dayMonth[3]}` : `${month} ${Number(dayMonth[1])}`;
    }
  }

  return raw;
}

function translateTargetAction(value) {
  return translateTargetLabel(value, TARGET_ACTION_TRANSLATIONS);
}

function translateTargetRating(value) {
  return translateTargetLabel(value, TARGET_RATING_TRANSLATIONS);
}

function getDataStatusLabel(marketData = state.marketData) {
  const fundamentalsProvider = marketData.fundamentalsProvider ?? "";
  const priceProvider = marketData.pricesProvider ?? "";
  const targetProvider = marketData.targetPricesProvider ?? "";
  const fundamentalsLabel = fundamentalsProvider.includes("verified;")
    ? fundamentalsProvider.replace("Official reports: ", "Official fundamentals: ")
    : fundamentalsProvider.includes("Legacy cached")
    ? "Legacy fundamentals (unverified) + official report links"
    : fundamentalsProvider.includes("Official")
      ? "Official report evidence"
      : "Fundamentals";
  const priceLabel = priceProvider.includes("Yahoo")
    ? "Yahoo prices"
    : priceProvider.includes("EODHD")
      ? "EODHD prices"
      : "Prices";
  const targetLabel = targetProvider.includes("Börskollen")
    ? "Börskollen target prices"
    : "Target prices";
  const labels = [
    marketData.pricesLoaded ? priceLabel : null,
    marketData.fundamentalsLoaded ? fundamentalsLabel : null,
    marketData.targetPricesLoaded ? targetLabel : null
  ].filter(Boolean);
  return labels.length ? labels.join(" + ") : "Sample or saved inputs";
}

function getSelectedGrowthAssumption(company) {
  const isConsensus = state.growthAssumption === "consensus";
  const value = numberOrNull(isConsensus ? company?.consensusGrowth : company?.growth5y);
  return {
    key: isConsensus ? "consensus" : "cagr",
    label: isConsensus ? "Market consensus FCF CAGR" : "Historical FCF CAGR",
    shortLabel: isConsensus ? "Market consensus" : "CAGR",
    value,
    source: isConsensus
      ? (company?.consensusGrowthSource ?? "MarketScreener three-year analyst-consensus FCF forecast")
      : (company?.growth5ySource ?? "Official company reports"),
    horizon: isConsensus
      ? (company?.consensusGrowthAudit?.valid
          ? `${company.consensusGrowthAudit.firstEstimateYear}E–${company.consensusGrowthAudit.lastEstimateYear}E FCF CAGR; published estimates fill years 1–3 and the CAGR extends years 4–5`
          : "Three published annual FCF estimates; their CAGR extends forecast years four and five")
      : `${company?.growth5yYears ?? "Historical"}-year FCF CAGR, applied across the five-year DCF forecast`
  };
}

function getFcfUnitMultiplier(unit) {
  const normalized = String(unit ?? "million").toLowerCase();
  if (normalized.startsWith("billion")) return 1e9;
  if (normalized.startsWith("thousand")) return 1e3;
  return 1e6;
}

function getMarketConsensusPerShareRows(company, audit) {
  if (!audit?.valid || !Array.isArray(audit.forecastRows) || audit.forecastRows.length !== 3) {
    return { valid: false, reason: audit?.reason ?? "Three validated market-consensus estimates are required" };
  }
  const shares = numberOrNull(company?.fundamentals?.sharesOutstanding);
  if (shares === null || shares <= 0) {
    return { valid: false, reason: "Outstanding shares are unavailable for the per-share conversion" };
  }
  if (!audit.fx?.valid) {
    return { valid: false, reason: audit.fx?.reason ?? "A valid reporting-currency conversion is unavailable" };
  }
  if (String(company?.currency ?? "SEK").toUpperCase() !== "SEK") {
    return { valid: false, reason: "Market-consensus FCF currently requires a SEK-quoted share" };
  }

  const multiplier = getFcfUnitMultiplier(audit.unit);
  const rateToSek = numberOrNull(audit.fx.rateToSek);
  if (rateToSek === null || rateToSek <= 0) {
    return { valid: false, reason: "The reporting-currency conversion rate is invalid" };
  }
  return {
    valid: true,
    rows: audit.forecastRows.map((row) => ({
      ...row,
      cashFlowPerShare: row.fcf * multiplier * rateToSek / shares
    })),
    shares,
    multiplier,
    rateToSek
  };
}

function buildMarketConsensusDcfFlows(company, audit, extensionGrowth) {
  const converted = getMarketConsensusPerShareRows(company, audit);
  if (!converted.valid) return { valid: false, reason: converted.reason, flows: [] };
  if (!Number.isFinite(extensionGrowth) || extensionGrowth <= -1) {
    return { valid: false, reason: "The market-consensus extension rate is invalid", flows: [] };
  }

  const flows = converted.rows.map((row, index) => ({
    year: index + 1,
    fiscalYear: row.year,
    label: `${row.year}E`,
    cashFlow: row.cashFlowPerShare,
    source: "Analyst consensus"
  }));
  let cashFlow = flows[flows.length - 1].cashFlow;
  let fiscalYear = flows[flows.length - 1].fiscalYear;
  for (let year = 4; year <= 5; year += 1) {
    cashFlow *= 1 + extensionGrowth;
    fiscalYear += 1;
    flows.push({
      year,
      fiscalYear,
      label: `${fiscalYear}E`,
      cashFlow,
      source: "Forecast CAGR extension"
    });
  }
  return { valid: true, flows };
}

function calculateDcf(company, scenario = "base", growthOverride = null) {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const fcf = asNumber(company.fcfPerShare);
  const assumption = getSelectedGrowthAssumption(company);
  const selectedGrowth = growthOverride ?? (assumption.value === null ? null : assumption.value + adjustment.growth);
  const growth = selectedGrowth === null ? NaN : selectedGrowth / 100;
  const wacc = (asNumber(company.wacc) + adjustment.wacc) / 100;
  const terminalGrowth = asNumber(company.terminalGrowth) / 100;
  const usesMarketConsensusPath = growthOverride === null && assumption.key === "consensus";

  if ((!usesMarketConsensusPath && fcf <= 0) || !Number.isFinite(growth) || wacc <= terminalGrowth || wacc <= 0) {
    return {
      value: NaN,
      flows: [],
      error: !Number.isFinite(growth) ? `${assumption.shortLabel} is unavailable` : "DCF input conflict"
    };
  }

  let flows = [];
  if (usesMarketConsensusPath) {
    const consensusForecast = buildMarketConsensusDcfFlows(company, company.consensusGrowthAudit, growth);
    if (!consensusForecast.valid) {
      return { value: NaN, flows: [], error: consensusForecast.reason };
    }
    flows = consensusForecast.flows;
  } else {
    for (let year = 1; year <= 5; year += 1) {
      const cashFlow = fcf * ((1 + growth) ** year);
      flows.push({ year, label: `Y${year}E`, cashFlow, source: assumption.shortLabel });
    }
  }

  let presentValue = 0;
  flows = flows.map((flow) => {
    const discounted = flow.cashFlow / ((1 + wacc) ** flow.year);
    presentValue += discounted;
    return { ...flow, discounted };
  });

  const yearFiveCashFlow = flows[flows.length - 1].cashFlow;
  const terminalValue = (yearFiveCashFlow * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const discountedTerminal = terminalValue / ((1 + wacc) ** 5);

  return {
    value: presentValue + discountedTerminal,
    flows,
    presentValue,
    terminalValue,
    discountedTerminal,
    cashFlowBasis: "equity-fcf",
    forecastMethod: usesMarketConsensusPath ? "published-consensus-plus-cagr-extension" : "constant-growth",
    growthAssumption: assumption,
    error: ""
  };
}

function getPeSuitability(company, audit) {
  const category = normalizeCompanyType(company.companyType, company.ticker);
  if (category === "investment") {
    return "P/E is not used for investment companies because NAV is the more representative equity measure.";
  }
  if (category === "cyclical") {
    return audit?.valid
      ? "For this cyclical company, analyst EPS estimates are shown only as a 0%-weight cross-check; the cycle-normalized model remains primary."
      : "P/E is unavailable until three positive, traceable analyst EPS estimates are present.";
  }
  if (!audit?.valid) {
    return "P/E is unavailable until three positive, traceable analyst EPS estimates are present.";
  }
  if (category === "bank") {
    return "Forward P/E can be informative for a bank, but the dashboard keeps P/B as the primary bank model.";
  }
  return numberOrNull(company.eps) !== null && Number(company.eps) <= 0
    ? "This is a higher-risk turnaround valuation because current EPS is non-positive; the model uses only the three positive analyst estimates."
    : "Suitable as a secondary valuation model because three positive analyst EPS estimates are available.";
}

function calculateForwardPeModel(company, scenario = "base") {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const audit = company.consensusEpsAudit ?? getMarketScreenerEpsForecastAudit(marketScreenerFcf?.[company.id]);
  const suitability = getPeSuitability(company, audit);
  const currentPe = getCurrentPeRatio(company);
  const targetPe = currentPe === null ? NaN : Math.max(0, currentPe + adjustment.targetPe);
  const requiredReturn = (asNumber(company.wacc) + adjustment.wacc) / 100;
  const years = 5;

  if (!audit?.valid) {
    return { value: NaN, flows: [], error: audit?.reason ?? suitability, audit, suitability };
  }
  if (!Number.isFinite(targetPe) || targetPe <= 0) {
    return { value: NaN, flows: [], error: "A positive current P/E is required as the terminal multiple anchor.", audit, suitability };
  }
  if (!Number.isFinite(requiredReturn) || requiredReturn <= -1) {
    return { value: NaN, flows: [], error: "A valid required equity return is required.", audit, suitability };
  }

  const extensionGrowth = audit.growth + adjustment.growth / 100;
  if (!Number.isFinite(extensionGrowth) || extensionGrowth <= -1) {
    return { value: NaN, flows: [], error: "The EPS CAGR extension is invalid.", audit, suitability };
  }

  const flows = audit.forecastRows.map((row) => ({
    year: row.year,
    label: `${row.year}E`,
    eps: row.epsSek,
    sourceEps: row.eps,
    source: "Published analyst consensus EPS"
  }));
  let extendedEps = flows.at(-1).eps;
  for (let offset = 1; offset <= 2; offset += 1) {
    extendedEps *= 1 + extensionGrowth;
    flows.push({
      year: audit.lastEstimateYear + offset,
      label: `${audit.lastEstimateYear + offset}E`,
      eps: extendedEps,
      sourceEps: extendedEps / audit.fx.rateToSek,
      source: "EPS forecast CAGR extension"
    });
  }
  const forecastEps = flows.at(-1).eps;
  const terminalPrice = forecastEps * targetPe;
  const discountFactor = (1 + requiredReturn) ** years;
  const value = terminalPrice / discountFactor;

  return {
    value,
    flows,
    forecastEps,
    terminalPrice,
    discountFactor,
    targetPe,
    currentPe,
    publishedGrowth: audit.growth * 100,
    extensionGrowth: extensionGrowth * 100,
    requiredReturn,
    years,
    startingEps: numberOrNull(company.eps),
    audit,
    suitability,
    error: ""
  };
}

function calculatePeValue(company, scenario = "base") {
  return calculateForwardPeModel(company, scenario).value;
}

function calculateEbitdaValue(company, scenario = "base", useNormalized = false) {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const ebitdaPerShare = useNormalized
    ? numberOrNull(company.normalizedEbitdaPerShare)
    : numberOrNull(company.ebitdaPerShare);
  const targetMultiple = Math.max(0, asNumber(company.targetEvToEbitda) + adjustment.targetPe * 0.35);
  const netDebt = asNumber(company.netDebtPerShare);
  return ebitdaPerShare && ebitdaPerShare > 0 && targetMultiple > 0
    ? ebitdaPerShare * targetMultiple - netDebt
    : NaN;
}

function averageValid(values) {
  const validValues = values.filter(Number.isFinite);
  return validValues.length ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length : NaN;
}

function buildValuationBlend(items, crossChecks = []) {
  const included = items.filter((item) => Number.isFinite(item.value) && item.weight > 0);
  const totalWeight = included.reduce((sum, item) => sum + item.weight, 0);
  if (!included.length || totalWeight <= 0) {
    return {
      value: NaN,
      components: [],
      excluded: items.map((item) => item.label),
      configured: items.map((item) => ({ label: item.label, weight: item.weight })),
      crossChecks
    };
  }

  const components = included.map((item) => {
    const effectiveWeight = item.weight / totalWeight;
    return {
      ...item,
      effectiveWeight,
      contribution: item.value * effectiveWeight
    };
  });

  return {
    value: components.reduce((sum, item) => sum + item.contribution, 0),
    components,
    excluded: items
      .filter((item) => !Number.isFinite(item.value) || item.weight <= 0)
      .map((item) => item.label),
    configured: items.map((item) => ({ label: item.label, weight: item.weight })),
    crossChecks
  };
}

function formatBlendWeight(weight) {
  const percentage = weight * 100;
  const digits = Math.abs(percentage - Math.round(percentage)) < 0.05 ? 0 : 1;
  return `${formatDecimal(percentage, digits)}%`;
}

function describeValuationBlend(blend, currency = "SEK") {
  if (!blend?.components?.length) return "No valuation model currently has a usable value";
  const contributions = blend.components
    .map((item) => `${formatBlendWeight(item.effectiveWeight)} ${item.label} = ${formatCurrency(item.contribution, currency)}`)
    .join(" + ");
  const exclusions = blend.excluded?.length
    ? ` ${blend.excluded.join(" and ")}: excluded because no usable value is available.`
    : "";
  const configuredWeights = blend.excluded?.length && blend.configured?.length
    ? ` Remaining weights are rebalanced from ${blend.configured
      .map((item) => `${formatBlendWeight(item.weight)} ${item.label}`)
      .join(", ")}.`
    : "";
  const crossChecks = blend.crossChecks?.length
    ? ` ${blend.crossChecks.join(" and ")}: 0% cross-checks; they do not change the intrinsic value.`
    : "";
  return `${contributions}.${exclusions}${configuredWeights}${crossChecks}`;
}

function renderValuationBreakdown(model, currency = "SEK") {
  const blend = model?.valuationBlend;
  const configured = Array.isArray(blend?.configured) ? blend.configured : [];
  if (!configured.length) {
    elements.metricValueSub.className = "valuation-breakdown is-message";
    elements.metricValueSub.textContent = model?.valueDescription ?? "No valuation available";
    return;
  }

  const componentsByLabel = new Map(blend.components.map((item) => [item.label, item]));
  elements.metricValueSub.className = "valuation-breakdown";
  elements.metricValueSub.innerHTML = configured.map((item) => {
    const component = componentsByLabel.get(item.label);
    const weight = component ? formatBlendWeight(component.effectiveWeight) : "0%";
    const contribution = component ? formatCurrency(component.contribution, currency) : "–";
    const rowClass = component ? "valuation-model-row" : "valuation-model-row is-excluded";
    const explanation = component
      ? `${item.label}: ${weight} effective weight contributes ${contribution} to intrinsic value`
      : `${item.label}: excluded because no usable value is available`;
    return `
      <div class="${rowClass}" title="${escapeHtml(explanation)}" aria-label="${escapeHtml(explanation)}">
        <span class="valuation-model-name">${escapeHtml(item.label)}</span>
        <span class="valuation-model-weight">${escapeHtml(weight)}</span>
        <strong class="valuation-model-contribution">${escapeHtml(contribution)}</strong>
      </div>
    `;
  }).join("");
}

function getBookValuePerShare(company) {
  return numberOrNull(company.bookValuePerShare) ?? numberOrNull(company.fundamentals?.equityPerShare);
}

function getRoe(company) {
  const manualRoe = numberOrNull(company.roe);
  if (manualRoe !== null) return manualRoe;

  const bookValuePerShare = getBookValuePerShare(company);
  if (bookValuePerShare && bookValuePerShare > 0 && asNumber(company.eps) > 0) {
    return (asNumber(company.eps) / bookValuePerShare) * 100;
  }

  const fundamentals = company.fundamentals ?? {};
  const netIncome = numberOrNull(fundamentals.netIncome);
  const bookEquity = numberOrNull(fundamentals.bookEquity);
  if (netIncome !== null && bookEquity && bookEquity > 0) {
    return (netIncome / bookEquity) * 100;
  }

  return NaN;
}

function getNormalizedFcfPerShare(company) {
  return numberOrNull(company.normalizedFcfPerShare);
}

function getNavPerShare(company) {
  return numberOrNull(company.navPerShare)
    ?? numberOrNull(company.bookValuePerShare)
    ?? numberOrNull(company.fundamentals?.bookValuePerShare)
    ?? numberOrNull(company.fundamentals?.equityPerShare);
}

function getInvestmentNavAudit(company) {
  const explicitNav = numberOrNull(company.navPerShare);
  const bookValue = numberOrNull(company.bookValuePerShare)
    ?? numberOrNull(company.fundamentals?.bookValuePerShare)
    ?? numberOrNull(company.fundamentals?.equityPerShare);
  const navPerShare = explicitNav ?? bookValue;
  const marketPrice = numberOrNull(company.marketPrice);
  const discountToNav = navPerShare !== null && navPerShare > 0 && marketPrice !== null
    ? ((navPerShare - marketPrice) / navPerShare) * 100
    : NaN;
  const priceToNav = navPerShare !== null && navPerShare > 0 && marketPrice !== null
    ? marketPrice / navPerShare
    : NaN;
  const officialSource = company.officialSource ?? company.fundamentals?.officialSource ?? null;
  const sourceUrl = officialSource?.sourceUrl ?? officialSource?.directReportUrl ?? null;
  const sourceName = officialSource?.sourceName ?? "Official company report";
  const period = officialSource?.period ?? company.balanceSheetDate ?? company.fundamentals?.balanceSheetDate ?? null;

  return {
    navPerShare,
    marketPrice,
    discountToNav,
    priceToNav,
    basis: explicitNav !== null ? "Reported NAV per share" : "Reported book equity per share",
    sourceUrl,
    sourceName,
    period
  };
}

function calculateOperatingModel(company, scenario) {
  const dcf = calculateDcf(company, scenario);
  const peValue = calculatePeValue(company, scenario);
  const ebitdaValue = calculateEbitdaValue(company, scenario);
  const currentPe = asNumber(company.eps) > 0 ? asNumber(company.marketPrice) / asNumber(company.eps) : NaN;
  const currentEvEbitda = numberOrNull(company.fundamentals?.evToEbitda);
  const reverse = calculateReverseDcf(company, scenario);
  const reverseBurdenScore = Number.isFinite(reverse.value)
    ? clamp(100 - Math.max(0, reverse.value - asNumber(company.consensusGrowth)) * 7, 0, 100)
    : 50;
  const currency = company.currency ?? "SEK";
  const valuationBlend = buildValuationBlend([
    { label: "DCF", value: dcf.value, weight: 0.45 },
    { label: "P/E", value: peValue, weight: 0.25 },
    { label: "EV/EBITDA", value: ebitdaValue, weight: 0.3 }
  ]);

  return {
    dcf,
    peValue,
    ebitdaValue,
    currentPe,
    blendedValue: valuationBlend.value,
    valuationBlend,
    primaryLabel: "DCF value",
    primaryValue: dcf.value,
    secondaryLabel: "P/E value",
    secondaryValue: peValue,
    tertiaryLabel: "EV/EBITDA value",
    tertiaryValue: formatCurrency(ebitdaValue, company.currency ?? "SEK"),
    reverseLabel: "Reverse DCF",
    reverseValue: reverse.label,
    reverseSub: `Consensus ${formatPercent(asNumber(company.consensusGrowth), 1)}`,
    valueDescription: Number.isFinite(valuationBlend.value)
      ? describeValuationBlend(valuationBlend, currency)
      : "Needs FCF, EPS or EBITDA inputs",
    modelSupportScore: reverseBurdenScore,
    modelWarning: "",
    chartTitle: Number.isFinite(currentEvEbitda)
      ? `Projected FCF / share | Current EV/EBITDA ${formatDecimal(currentEvEbitda, 1)}x`
      : "Projected FCF / share"
  };
}

function calculateBankModel(company, scenario) {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const currency = company.currency ?? "SEK";
  const price = asNumber(company.marketPrice);
  const bookValuePerShare = getBookValuePerShare(company);
  const roe = getRoe(company);
  const costOfEquity = Math.max(0.01, (asNumber(company.wacc) + adjustment.wacc) / 100);
  const growth = clamp(asNumber(company.terminalGrowth) / 100, 0, 0.04);
  const justifiedPb = bookValuePerShare && bookValuePerShare > 0 && Number.isFinite(roe) && costOfEquity > growth
    ? clamp(((roe / 100) - growth) / (costOfEquity - growth), 0.4, 2.8)
    : NaN;
  const pbValue = Number.isFinite(justifiedPb) ? bookValuePerShare * justifiedPb : NaN;
  const peValue = calculatePeValue(company, scenario);
  const currentPb = bookValuePerShare && bookValuePerShare > 0 ? price / bookValuePerShare : NaN;
  const currentPe = asNumber(company.eps) > 0 ? price / asNumber(company.eps) : NaN;
  const roeSpread = Number.isFinite(roe) ? roe - costOfEquity * 100 : NaN;
  const valuationBlend = buildValuationBlend([
    { label: "P/B", value: pbValue, weight: 0.65 },
    { label: "P/E", value: peValue, weight: 0.35 }
  ]);

  return {
    dcf: { value: NaN, flows: [], error: "" },
    peValue,
    currentPe,
    blendedValue: valuationBlend.value,
    valuationBlend,
    primaryLabel: "P/B value",
    primaryValue: pbValue,
    secondaryLabel: "P/E value",
    secondaryValue: peValue,
    tertiaryLabel: "ROE / P/B",
    tertiaryValue: Number.isFinite(roe) || Number.isFinite(currentPb)
      ? `${formatPercent(roe, 1)} / ${Number.isFinite(currentPb) ? `${formatDecimal(currentPb, 1)}x` : "-"}`
      : "-",
    reverseLabel: "ROE spread",
    reverseValue: formatPercent(roeSpread, 1),
    reverseSub: "Versus required return",
    valueDescription: Number.isFinite(valuationBlend.value)
      ? describeValuationBlend(valuationBlend, currency)
      : "Needs book equity per share and ROE",
    modelSupportScore: Number.isFinite(roeSpread) ? clamp(50 + roeSpread * 5, 0, 100) : 50,
    modelWarning: Number.isFinite(pbValue) ? "" : "Add book value per share and ROE for the bank model.",
    chartTitle: "Bank model"
  };
}

function calculateInvestmentModel(company, scenario) {
  const currency = company.currency ?? "SEK";
  const navAudit = getInvestmentNavAudit(company);
  const navPerShare = navAudit.navPerShare;
  const navDiscount = navAudit.discountToNav;
  const hasDiscount = Number.isFinite(navDiscount) && navDiscount >= 0;
  const navPositionValue = Number.isFinite(navDiscount) ? formatPercent(Math.abs(navDiscount), 1) : "-";
  const valuationBlend = buildValuationBlend([
    { label: "NAV", value: navPerShare, weight: 1 }
  ]);

  return {
    dcf: { value: NaN, flows: [], error: "" },
    peValue: NaN,
    currentPe: NaN,
    blendedValue: valuationBlend.value,
    valuationBlend,
    primaryLabel: "NAV value",
    primaryValue: navPerShare,
    secondaryLabel: "Current price",
    secondaryValue: navAudit.marketPrice,
    tertiaryLabel: hasDiscount ? "NAV discount" : "NAV premium",
    tertiaryValue: navPositionValue,
    reverseLabel: hasDiscount ? "NAV discount" : "NAV premium",
    reverseValue: navPositionValue,
    reverseSub: "Discount/premium to NAV",
    valueDescription: Number.isFinite(navPerShare)
      ? `100% NAV = ${formatCurrency(navPerShare, currency)}. The market trades at a ${navPositionValue} ${hasDiscount ? "discount" : "premium"} to that value.`
      : "Needs NAV per share",
    modelSupportScore: Number.isFinite(navDiscount) ? clamp(50 + navDiscount * 1.2, 0, 100) : 50,
    modelWarning: Number.isFinite(navPerShare) ? "" : "Add NAV per share for the investment-company model.",
    chartTitle: "Investment company model"
  };
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((first, second) => first - second);
  if (!sorted.length) return NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function getCyclicalSubtype(company) {
  const ticker = company?.ticker;
  if (ticker === "BOL.ST") {
    return {
      key: "commodity",
      label: "Commodity producer",
      note: "Boliden is normalized across reported cash-flow years so one metal-price year cannot set the valuation. A future commodity-price bridge should be shown as a separate cross-check, not hidden inside this DCF."
    };
  }
  if (ticker === "SCA-B.ST") {
    return {
      key: "forest-assets",
      label: "Forest assets + operations",
      note: "The mid-cycle cash-flow DCF values the operating cash flow. A verified forest-asset NAV should be displayed separately when that dataset is available; book equity is not silently treated as forest NAV."
    };
  }
  if (ticker === "SKA-B.ST") {
    return {
      key: "construction",
      label: "Construction + development",
      note: "A verified segment sum-of-the-parts is the preferred cross-check for Skanska. Until segment assets and margins are collected, the dashboard does not invent an SOTP value."
    };
  }
  return {
    key: "industrial",
    label: "Industrial cycle",
    note: "The forecast is allowed to follow the selected near-term path, then fades back to the company’s report-derived mid-cycle cash flow before the terminal value is calculated."
  };
}

function getCyclicalHistoryNormalization(company) {
  const hasFcffHistory = Array.isArray(company?.fcffHistory) && company.fcffHistory.length > 0;
  const rawRows = hasFcffHistory ? company.fcffHistory : company?.fcfHistory;
  const shares = numberOrNull(company?.fundamentals?.sharesOutstanding);
  if (!Array.isArray(rawRows) || rawRows.length < 5) {
    return {
      valid: false,
      reason: `At least five consecutive official-report cash-flow years are required; ${Array.isArray(rawRows) ? rawRows.length : 0} are stored.`,
      rows: [],
      basis: hasFcffHistory ? "fcff" : "equity-fcf"
    };
  }
  if (shares === null || shares <= 0) {
    return { valid: false, reason: "Verified outstanding shares are required for the per-share conversion.", rows: [], basis: hasFcffHistory ? "fcff" : "equity-fcf" };
  }

  const rows = rawRows
    .map((row) => ({ ...row, year: Number(row.year), cashFlow: numberOrNull(row.fcff ?? row.fcf) }))
    .filter((row) => Number.isInteger(row.year) && row.cashFlow !== null)
    .sort((first, second) => first.year - second.year);
  if (rows.length < 5) {
    return { valid: false, reason: "Fewer than five annual cash-flow observations contain a usable value.", rows: [], basis: hasFcffHistory ? "fcff" : "equity-fcf" };
  }
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].year !== rows[index - 1].year + 1) {
      return { valid: false, reason: "The official cash-flow history has a missing fiscal year, so a full-cycle normalization is not shown.", rows, basis: hasFcffHistory ? "fcff" : "equity-fcf" };
    }
  }
  const untraceableRow = rows.find((row) => !row.sourceUrl || String(row.sourceUrl).includes("marketscreener.com"));
  if (untraceableRow) {
    return { valid: false, reason: `${untraceableRow.year} is not linked to an official company source.`, rows, basis: hasFcffHistory ? "fcff" : "equity-fcf" };
  }
  const quoteCurrency = String(company.currency ?? "SEK").toUpperCase();
  const mismatchedCurrencyRow = rows.find((row) => row.quoteCurrency && String(row.quoteCurrency).toUpperCase() !== quoteCurrency);
  if (mismatchedCurrencyRow) {
    return { valid: false, reason: `${mismatchedCurrencyRow.year} is stored in ${mismatchedCurrencyRow.quoteCurrency}, not ${quoteCurrency}.`, rows, basis: hasFcffHistory ? "fcff" : "equity-fcf" };
  }

  const normalizedCashFlow = median(rows.map((row) => row.cashFlow));
  const perShare = normalizedCashFlow / shares;
  if (!Number.isFinite(perShare) || perShare <= 0) {
    return { valid: false, reason: "The full-cycle median cash flow is not positive, so the DCF cannot use it.", rows, basis: hasFcffHistory ? "fcff" : "equity-fcf" };
  }

  const basis = hasFcffHistory
    ? "fcff"
    : (rows.every((row) => row.method === "cfo-minus-capex") ? "equity-fcf" : "company-defined-after-capex");
  return {
    valid: true,
    rows,
    shares,
    normalizedCashFlow,
    perShare,
    basis,
    firstYear: rows[0].year,
    lastYear: rows[rows.length - 1].year,
    observations: rows.length,
    sourceUrls: [...new Set(rows.map((row) => row.sourceUrl))],
    sourceNames: [...new Set(rows.map((row) => row.sourceName).filter(Boolean))]
  };
}

function buildCyclicalDcfFlows(company, scenario, normalization) {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const assumption = getSelectedGrowthAssumption(company);
  const terminalGrowth = asNumber(company.terminalGrowth) / 100;
  const scenarioGrowth = adjustment.growth / 100;
  const targetGrowth = clamp(terminalGrowth + scenarioGrowth, -0.05, 0.08);
  const normalizedYearFive = normalization.perShare * ((1 + targetGrowth) ** 5);
  const flows = [];

  if (assumption.key === "consensus") {
    const consensus = getMarketConsensusPerShareRows(company, company.consensusGrowthAudit);
    if (!consensus.valid) return { valid: false, reason: consensus.reason, flows: [] };
    consensus.rows.forEach((row, index) => {
      flows.push({
        year: index + 1,
        fiscalYear: row.year,
        label: `${row.year}E`,
        cashFlow: row.cashFlowPerShare,
        source: "Published analyst consensus"
      });
    });
  } else {
    const currentFcf = numberOrNull(company.fcfPerShare);
    const selectedGrowth = assumption.value === null ? null : (assumption.value + adjustment.growth) / 100;
    const startingCashFlow = currentFcf !== null && currentFcf > 0 ? currentFcf : normalization.perShare;
    for (let year = 1; year <= 3; year += 1) {
      const cashFlow = selectedGrowth === null
        ? startingCashFlow + (normalizedYearFive - startingCashFlow) * (year / 5)
        : startingCashFlow * ((1 + selectedGrowth) ** year);
      flows.push({
        year,
        label: `Y${year}E`,
        cashFlow,
        source: selectedGrowth === null ? "Mid-cycle fade; historical CAGR unavailable" : "Historical FCF CAGR"
      });
    }
  }

  const yearThreeCashFlow = flows[flows.length - 1].cashFlow;
  flows.push({ year: 4, label: "Y4E", cashFlow: yearThreeCashFlow + (normalizedYearFive - yearThreeCashFlow) * 0.5, source: "50% fade to mid-cycle" });
  flows.push({ year: 5, label: "Y5E", cashFlow: normalizedYearFive, source: "Normalized mid-cycle" });
  return { valid: true, flows, assumption, normalizedYearFive, targetGrowth };
}

function calculateCyclicalDcf(company, scenario = "base") {
  const normalization = getCyclicalHistoryNormalization(company);
  if (!normalization.valid) {
    return { value: NaN, flows: [], error: normalization.reason, normalization };
  }

  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const discountRate = (asNumber(company.wacc) + adjustment.wacc) / 100;
  const terminalGrowth = asNumber(company.terminalGrowth) / 100;
  if (discountRate <= 0 || discountRate <= terminalGrowth) {
    return { value: NaN, flows: [], error: "The discount rate must be positive and above terminal growth.", normalization };
  }

  const forecast = buildCyclicalDcfFlows(company, scenario, normalization);
  if (!forecast.valid) {
    return { value: NaN, flows: [], error: forecast.reason, normalization };
  }

  let presentValue = 0;
  const flows = forecast.flows.map((flow) => {
    const discounted = flow.cashFlow / ((1 + discountRate) ** flow.year);
    presentValue += discounted;
    return { ...flow, discounted };
  });
  const yearFiveCashFlow = flows[flows.length - 1].cashFlow;
  const terminalValue = (yearFiveCashFlow * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  const discountedTerminal = terminalValue / ((1 + discountRate) ** 5);
  const netDebtAdjustment = normalization.basis === "fcff" ? -asNumber(company.netDebtPerShare) : 0;

  return {
    value: presentValue + discountedTerminal + netDebtAdjustment,
    flows,
    presentValue,
    terminalValue,
    discountedTerminal,
    netDebtAdjustment,
    normalization,
    forecastMethod: forecast.assumption?.key === "consensus" ? "consensus-then-mid-cycle-fade" : "historical-path-then-mid-cycle-fade",
    normalizedYearFive: forecast.normalizedYearFive,
    targetGrowth: forecast.targetGrowth,
    cashFlowBasis: normalization.basis,
    discountRate,
    error: ""
  };
}

function calculateCyclicalPeCrossCheck(company, scenario = "base") {
  return calculateForwardPeModel(company, scenario).value;
}

function getSpecializedValuation(company, type = null) {
  const config = company?.specializedValuation;
  if (!config || (type && config.type !== type)) return null;
  return config;
}

function calculateBolidenCommodityCycle(company, scenario = "base") {
  const config = getSpecializedValuation(company, "boliden-commodity-cycle");
  const shares = numberOrNull(company?.fundamentals?.sharesOutstanding) ?? numberOrNull(company?.sharesOutstanding);
  const currentEbitda = numberOrNull(company?.fundamentals?.ebitda)
    ?? (shares && numberOrNull(company?.ebitdaPerShare) !== null ? shares * numberOrNull(company.ebitdaPerShare) : null);
  if (!config || !shares || shares <= 0 || currentEbitda === null || currentEbitda <= 0) {
    return { valid: false, value: NaN, error: "Boliden needs the official commodity-cycle inputs, shares and EBITDA." };
  }

  const drivers = [...(config.metalPrices ?? []), ...(config.exchangeRates ?? [])].map((driver) => {
    const nearTerm = asNumber(driver.nearTerm);
    const longTerm = asNumber(driver.longTerm);
    const relativeChange = nearTerm !== 0 ? longTerm / nearTerm - 1 : NaN;
    const operatingProfitAdjustment = Number.isFinite(relativeChange)
      ? asNumber(driver.operatingProfitSensitivityAt10Pct) * (relativeChange / 0.10)
      : NaN;
    return { ...driver, relativeChange, operatingProfitAdjustment };
  });
  const operatingProfitAdjustmentSekm = drivers.reduce(
    (sum, driver) => sum + (Number.isFinite(driver.operatingProfitAdjustment) ? driver.operatingProfitAdjustment : 0),
    0
  );
  const normalizedEbitda = currentEbitda + operatingProfitAdjustmentSekm * 1e6;
  const multiple = numberOrNull(config.normalizedEvEbitdaMultiple?.[scenario]);
  const netDebt = asNumber(company.netDebtPerShare) * shares;
  const enterpriseValue = multiple !== null && multiple > 0 ? normalizedEbitda * multiple : NaN;
  const evEbitdaValue = Number.isFinite(enterpriseValue) ? (enterpriseValue - netDebt) / shares : NaN;
  // The cash-flow component follows the same visible Growth forecast choice as
  // the page. Consensus can set years 1–3, but years 4–5 always fade to the
  // official-report mid-cycle median instead of extending a commodity spike.
  const dcf = calculateCyclicalDcf(company, scenario);
  const valuationBlend = buildValuationBlend([
    { label: "Commodity EV/EBITDA", value: evEbitdaValue, weight: asNumber(config.modelWeights?.commodityCycleEvEbitda) },
    { label: "Mid-cycle FCF DCF", value: dcf.value, weight: asNumber(config.modelWeights?.forwardFcfDcf) }
  ]);

  return {
    valid: Number.isFinite(valuationBlend.value),
    value: valuationBlend.value,
    valuationBlend,
    config,
    drivers,
    currentEbitda,
    operatingProfitAdjustmentSekm,
    normalizedEbitda,
    normalizedEbitdaPerShare: normalizedEbitda / shares,
    multiple,
    netDebt,
    enterpriseValue,
    evEbitdaValue,
    dcf,
    shares,
    error: Number.isFinite(valuationBlend.value) ? "" : "The commodity-cycle valuation has no usable component."
  };
}

function calculateSkanskaSotp(company, scenario = "base") {
  const config = getSpecializedValuation(company, "skanska-sotp");
  const shares = numberOrNull(company?.fundamentals?.sharesOutstanding) ?? numberOrNull(company?.sharesOutstanding);
  if (!config || !shares || shares <= 0) {
    return { valid: false, value: NaN, error: "Skanska needs the official SOTP inputs and outstanding shares." };
  }

  const construction = config.construction ?? {};
  const central = config.central ?? {};
  const normalizedConstructionEbit = averageValid([
    numberOrNull(construction.operatingIncome2025),
    numberOrNull(construction.operatingIncome2024)
  ]);
  const normalizedCentralCost = averageValid([
    numberOrNull(central.operatingCost2025),
    numberOrNull(central.operatingCost2024)
  ]);
  const attributableConstructionEbit = normalizedConstructionEbit - normalizedCentralCost;
  const constructionMultiple = numberOrNull(construction.ebitMultiple?.[scenario]);
  const constructionValueSekm = attributableConstructionEbit * constructionMultiple;
  const taxRate = asNumber(config.standardTaxRate);
  const afterTax = (value) => asNumber(value) * (1 - taxRate);
  const developmentFactor = asNumber(config.developmentValueFactor?.[scenario], 1);
  const residentialSekm = (asNumber(config.residentialDevelopment?.capitalEmployed)
    + afterTax(config.residentialDevelopment?.unrealizedSurplus)) * developmentFactor;
  const commercialSekm = (asNumber(config.commercialPropertyDevelopment?.capitalEmployed)
    + afterTax(config.commercialPropertyDevelopment?.unrealizedSurplus)) * developmentFactor;
  const investmentPropertiesSekm = asNumber(config.investmentProperties?.capitalEmployed) * developmentFactor;
  const pppSekm = afterTax(config.pppPortfolio?.unrealizedSurplus) * developmentFactor;
  const adjustedNetCashSekm = asNumber(config.adjustedNetCash);
  const totalEquityValueSekm = constructionValueSekm + residentialSekm + commercialSekm
    + investmentPropertiesSekm + pppSekm + adjustedNetCashSekm;
  const value = totalEquityValueSekm * 1e6 / shares;
  const components = [
    { label: "Construction franchise", valueSekm: constructionValueSekm },
    { label: "Residential development", valueSekm: residentialSekm },
    { label: "Commercial development", valueSekm: commercialSekm },
    { label: "Investment properties", valueSekm: investmentPropertiesSekm },
    { label: "PPP portfolio", valueSekm: pppSekm },
    { label: "Adjusted net cash", valueSekm: adjustedNetCashSekm }
  ].map((component) => ({ ...component, perShare: component.valueSekm * 1e6 / shares }));
  const valuationBlend = buildValuationBlend([{ label: "Skanska SOTP", value, weight: 1 }]);

  return {
    valid: Number.isFinite(value),
    value,
    valuationBlend,
    config,
    shares,
    normalizedConstructionEbit,
    normalizedCentralCost,
    attributableConstructionEbit,
    constructionMultiple,
    constructionValueSekm,
    taxRate,
    developmentFactor,
    components,
    totalEquityValueSekm,
    error: Number.isFinite(value) ? "" : "The Skanska SOTP inputs are incomplete."
  };
}

function calculateCyclicalModel(company, scenario) {
  const boliden = calculateBolidenCommodityCycle(company, scenario);
  if (getSpecializedValuation(company, "boliden-commodity-cycle")) {
    const currency = company.currency ?? "SEK";
    const normalizedFcfYield = asNumber(company.marketPrice) > 0 && Number.isFinite(boliden.dcf?.value)
      ? (asNumber(company.fcfPerShare) / asNumber(company.marketPrice)) * 100
      : NaN;
    return {
      ...boliden,
      dcf: boliden.dcf ?? { value: NaN, flows: [], error: boliden.error },
      peValue: NaN,
      ebitdaValue: boliden.evEbitdaValue,
      currentPe: getCurrentPeRatio(company),
      blendedValue: boliden.value,
      primaryLabel: "Commodity-cycle value",
      primaryValue: boliden.value,
      secondaryLabel: "Normalized EV/EBITDA",
      secondaryValue: boliden.evEbitdaValue,
      tertiaryLabel: "Normalized EBITDA/share",
      tertiaryValue: formatTickerMoney(boliden.normalizedEbitdaPerShare, currency),
      reverseLabel: "Current FCF yield",
      reverseValue: formatPercent(normalizedFcfYield, 1),
      reverseSub: "Current equity FCF / current price",
      valueDescription: Number.isFinite(boliden.value)
        ? describeValuationBlend(boliden.valuationBlend, currency)
        : `Commodity-cycle valuation unavailable: ${boliden.error}`,
      modelSupportScore: boliden.valid ? 90 : 20,
      modelWarning: boliden.error,
      chartTitle: "Boliden commodity-cycle normalization"
    };
  }

  const skanska = calculateSkanskaSotp(company, scenario);
  if (getSpecializedValuation(company, "skanska-sotp")) {
    const currency = company.currency ?? "SEK";
    const developmentPerShare = skanska.components
      ?.filter((component) => !["Construction franchise", "Adjusted net cash"].includes(component.label))
      .reduce((sum, component) => sum + component.perShare, 0);
    return {
      ...skanska,
      dcf: { value: NaN, flows: [], error: "Skanska is valued with SOTP, not a single-company DCF." },
      peValue: NaN,
      ebitdaValue: NaN,
      currentPe: getCurrentPeRatio(company),
      blendedValue: skanska.value,
      primaryLabel: "Sum of the parts",
      primaryValue: skanska.value,
      secondaryLabel: "Construction value",
      secondaryValue: skanska.components?.[0]?.perShare,
      tertiaryLabel: "Development NAV / share",
      tertiaryValue: formatTickerMoney(developmentPerShare, currency),
      reverseLabel: "Adjusted net cash / share",
      reverseValue: formatTickerMoney(skanska.components?.at(-1)?.perShare, currency),
      reverseSub: "Added once after the operating and asset values",
      valueDescription: Number.isFinite(skanska.value)
        ? describeValuationBlend(skanska.valuationBlend, currency)
        : `Skanska SOTP unavailable: ${skanska.error}`,
      modelSupportScore: skanska.valid ? 92 : 20,
      modelWarning: skanska.error,
      chartTitle: "Skanska construction and development SOTP"
    };
  }

  const currency = company.currency ?? "SEK";
  const price = asNumber(company.marketPrice);
  const dcf = calculateCyclicalDcf(company, scenario);
  const normalizedFcf = dcf.normalization?.valid ? dcf.normalization.perShare : NaN;
  const currentPe = getCurrentPeRatio(company);
  const ebitdaValue = calculateEbitdaValue(company, scenario, true);
  const peValue = calculateCyclicalPeCrossCheck(company, scenario);
  const normalizedFcfYield = price > 0 && Number.isFinite(normalizedFcf) ? (normalizedFcf / price) * 100 : NaN;
  const valuationBlend = buildValuationBlend(
    [{ label: "mid-cycle DCF", value: dcf.value, weight: 1 }],
    ["normalized EV/EBITDA", "normalized P/E"]
  );

  return {
    dcf,
    peValue,
    ebitdaValue,
    currentPe,
    // Cross-checks are deliberately not blended into the headline value.
    blendedValue: valuationBlend.value,
    valuationBlend,
    primaryLabel: "Mid-cycle DCF",
    primaryValue: dcf.value,
    secondaryLabel: "Normalized EV/EBITDA",
    secondaryValue: ebitdaValue,
    tertiaryLabel: "Normalized FCF yield",
    tertiaryValue: formatPercent(normalizedFcfYield, 1),
    reverseLabel: "Mid-cycle FCF yield",
    reverseValue: formatPercent(normalizedFcfYield, 1),
    reverseSub: "Median official-report cash flow / current price",
    valueDescription: Number.isFinite(dcf.value)
      ? describeValuationBlend(valuationBlend, currency)
      : `Mid-cycle DCF unavailable: ${dcf.error}`,
    modelSupportScore: dcf.normalization?.valid ? clamp(45 + dcf.normalization.observations * 6, 0, 90) : 20,
    modelWarning: dcf.error,
    chartTitle: "Mid-cycle cash-flow DCF"
  };
}

function calculateCategoryModel(company, scenario) {
  if (company.fundamentalsUsable === false) {
    return {
      dcf: { value: NaN, flows: [], error: "Fundamentals rejected" },
      peValue: NaN,
      ebitdaValue: NaN,
      currentPe: NaN,
      blendedValue: NaN,
      primaryLabel: "Data quality",
      primaryValue: NaN,
      secondaryLabel: "Valuation",
      secondaryValue: NaN,
      tertiaryLabel: "Status",
      tertiaryValue: "Unavailable",
      reverseLabel: "Data quality",
      reverseValue: "-",
      reverseSub: "Refresh or correct fundamentals",
      valueDescription: "Valuation disabled because fundamentals failed validation",
      modelSupportScore: 0,
      modelWarning: (company.dataQuality?.issues ?? ["Fundamentals failed validation"]).join("; "),
      chartTitle: "Fundamentals unavailable"
    };
  }
  const category = normalizeCompanyType(company.companyType, company.ticker);
  if (category === "bank") return calculateBankModel(company, scenario);
  if (category === "investment") return calculateInvestmentModel(company, scenario);
  if (category === "cyclical") return calculateCyclicalModel(company, scenario);
  return calculateOperatingModel(company, scenario);
}

function calculateReverseDcf(company, scenario = "base") {
  const price = asNumber(company.marketPrice);
  if (price <= 0 || asNumber(company.fcfPerShare) <= 0) return { value: NaN, label: "-" };

  const valueAt = (growth) => calculateDcf(company, scenario, growth * 100).value;
  const low = -0.4;
  const high = 0.6;
  const lowValue = valueAt(low);
  const highValue = valueAt(high);

  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return { value: NaN, label: "-" };
  if (price <= lowValue) return { value: low * 100, label: "< -40.0%" };
  if (price >= highValue) return { value: high * 100, label: "> +60.0%" };

  let left = low;
  let right = high;
  for (let index = 0; index < 70; index += 1) {
    const middle = (left + right) / 2;
    const middleValue = valueAt(middle);
    if (middleValue < price) {
      left = middle;
    } else {
      right = middle;
    }
  }

  const value = ((left + right) / 2) * 100;
  return { value, label: formatPercent(value, 1) };
}

function calculateCompany(company, scenario = state.scenario) {
  const category = normalizeCompanyType(company.companyType, company.ticker);
  const model = calculateCategoryModel(company, scenario);
  const marketPrice = asNumber(company.marketPrice);
  const blendedValue = model.blendedValue;
  const marginOfSafety = marketPrice > 0 && Number.isFinite(blendedValue)
    ? ((blendedValue - marketPrice) / marketPrice) * 100
    : NaN;
  const qualityScore = calculateQualityScore(company);
  const valuationScore = Number.isFinite(marginOfSafety) ? clamp(50 + marginOfSafety * 1.2, 0, 100) : 50;
  const modelSupportScore = Number.isFinite(model.modelSupportScore) ? model.modelSupportScore : 50;
  const researchScore = round((qualityScore * 0.42) + (valuationScore * 0.4) + (modelSupportScore * 0.18), 0);
  const portfolioScore = round((valuationScore * 0.55) + (modelSupportScore * 0.2) + (qualityScore * 0.25), 0);
  const stance = Number.isFinite(marginOfSafety)
    ? getStance(marginOfSafety, qualityScore)
    : { key: "model-needed", label: "Model needed" };

  return {
    dcf: model.dcf,
    peValue: model.peValue,
    blendedValue,
    marginOfSafety,
    currentPe: model.currentPe,
    reverse: { label: model.reverseValue, value: model.modelSupportScore },
    qualityScore,
    researchScore,
    portfolioScore,
    stance,
    category,
    model,
    modelWarning: model.modelWarning,
    valuationStance: stance,
    growthGap: asNumber(company.growth5y) - asNumber(company.consensusGrowth)
  };
}

function calculateQualityScore(company) {
  const industry = asNumber(company.industryScore, 3);
  const companyAdvantage = asNumber(company.companyScore, 3);
  const leadership = asNumber(company.leadershipScore, 3);
  return round(((industry * 0.34) + (companyAdvantage * 0.36) + (leadership * 0.3)) / 5 * 100, 0);
}

function getStance(marginOfSafety, qualityScore) {
  if (!Number.isFinite(marginOfSafety)) return { key: "fair", label: "Fair" };
  if (marginOfSafety >= 25 && qualityScore >= 70) return { key: "attractive", label: "Attractive" };
  if (marginOfSafety >= 10) return { key: "undervalued", label: "Undervalued" };
  if (marginOfSafety > -10) return { key: "fair", label: "Fair" };
  if (marginOfSafety > -25) return { key: "rich", label: "Rich" };
  return { key: "stretched", label: "Stretched" };
}

let marketScreenerFcf = null;
let riksbankFx = null;

function getFxAudit(currency) {
  const reportedCurrency = String(currency ?? "").toUpperCase();
  if (!reportedCurrency) {
    return { valid: false, reason: "The source reporting currency is missing" };
  }
  if (reportedCurrency === "SEK") {
    return {
      valid: true,
      noConversion: true,
      fromCurrency: "SEK",
      toCurrency: "SEK",
      rateToSek: 1
    };
  }

  const row = riksbankFx?.rates?.[reportedCurrency];
  const rate = numberOrNull(row?.rateToSek);
  const ageDays = daysSince(row?.date);
  if (!row || rate === null || rate <= 0 || ageDays === null || ageDays < -1) {
    return { valid: false, reason: `No valid ${reportedCurrency}/SEK reference rate is available` };
  }
  if (ageDays > 7) {
    return { valid: false, reason: `The ${reportedCurrency}/SEK reference rate is stale (${ageDays} days old)` };
  }
  return {
    valid: true,
    noConversion: false,
    fromCurrency: reportedCurrency,
    toCurrency: "SEK",
    rateToSek: rate,
    rateDate: row.date,
    seriesId: row.seriesId,
    apiUrl: row.apiUrl,
    sourceName: riksbankFx.sourceName ?? "Sveriges Riksbank",
    sourceUrl: riksbankFx.sourceUrl,
    retrievedAt: riksbankFx.updatedAt,
    ageDays
  };
}

function getMarketScreenerForecastAudit(row) {
  if (!row) return { valid: false, reason: "No MarketScreener FCF forecast is available" };
  if (!row.sourceUrl || !row.retrievedAt) {
    return { valid: false, reason: "The forecast is missing its source link or retrieval date" };
  }

  const ageDays = daysSince(row.retrievedAt);
  if (ageDays === null || ageDays < -1) {
    return { valid: false, reason: "The forecast has an invalid retrieval date" };
  }
  if (ageDays > 21) {
    return { valid: false, reason: `The MarketScreener snapshot is stale (${ageDays} days old)` };
  }

  const forecast = Array.isArray(row.fcfForecast)
    ? row.fcfForecast.filter((item) => Number.isFinite(Number(item?.year)) && numberOrNull(item?.fcf) !== null)
    : [];
  forecast.sort((left, right) => Number(left.year) - Number(right.year));
  if (forecast.length < 3) {
    return { valid: false, reason: "Three annual MarketScreener FCF estimates are required" };
  }

  const forecastRows = forecast.slice(0, 3).map((item) => ({
    year: Number(item.year),
    fcf: Number(item.fcf)
  }));
  const forecastYears = forecastRows.map((item) => item.year);
  if (!forecastYears.every((year, index) => index === 0 || year === forecastYears[index - 1] + 1)) {
    return { valid: false, reason: "The three forecast fiscal years must be consecutive" };
  }
  const retrievedYear = new Date(row.retrievedAt).getUTCFullYear();
  if (forecastYears[0] < retrievedYear) {
    return { valid: false, reason: "The first forecast fiscal year is already in the past" };
  }
  if (forecastRows.some((item) => item.fcf <= 0)) {
    return { valid: false, reason: "Forecast CAGR requires positive FCF in all three estimate years" };
  }

  const periods = forecastRows.length - 1;
  const growth = (forecastRows[forecastRows.length - 1].fcf / forecastRows[0].fcf) ** (1 / periods) - 1;
  const storedGrowth = numberOrNull(row.consensusFcfCagr);
  if (storedGrowth === null || Math.abs(storedGrowth - growth) > 0.00001) {
    return { valid: false, reason: "The stored MarketScreener forecast CAGR does not reconcile to its three FCF estimates" };
  }

  const reportedCurrency = row.reportedCurrency ?? row.currency;
  const projectionRows = [];
  let projectedFcf = forecastRows[forecastRows.length - 1].fcf;
  for (let offset = 1; offset <= 2; offset += 1) {
    projectedFcf *= 1 + growth;
    projectionRows.push({
      year: forecastRows[forecastRows.length - 1].year + offset,
      fcf: projectedFcf
    });
  }
  return {
    valid: true,
    growth,
    periods,
    forecastRows,
    projectionRows,
    firstEstimateYear: forecastRows[0].year,
    lastEstimateYear: forecastRows[forecastRows.length - 1].year,
    firstEstimateFcf: forecastRows[0].fcf,
    lastEstimateFcf: forecastRows[forecastRows.length - 1].fcf,
    currency: reportedCurrency,
    reportedCurrency,
    displayCurrency: "SEK",
    unit: row.unit ?? "million",
    fx: getFxAudit(reportedCurrency),
    currencyEvidence: row.currencyEvidence ?? null,
    sourceUrl: row.sourceUrl,
    retrievedAt: row.retrievedAt,
    ageDays
  };
}

function getMarketScreenerEpsForecastAudit(row) {
  if (!row) return { valid: false, reason: "No MarketScreener EPS estimates are available" };
  if (!row.sourceUrl || !row.retrievedAt) {
    return { valid: false, reason: "The EPS estimates are missing their source link or retrieval date" };
  }

  const ageDays = daysSince(row.retrievedAt);
  if (ageDays === null || ageDays < -1) {
    return { valid: false, reason: "The EPS estimates have an invalid retrieval date" };
  }
  if (ageDays > 21) {
    return { valid: false, reason: `The MarketScreener EPS snapshot is stale (${ageDays} days old)` };
  }

  const forecast = Array.isArray(row.epsForecast)
    ? row.epsForecast.filter((item) => Number.isFinite(Number(item?.year)) && numberOrNull(item?.eps) !== null)
    : [];
  forecast.sort((left, right) => Number(left.year) - Number(right.year));
  if (forecast.length < 3) {
    return { valid: false, reason: "Three annual MarketScreener EPS estimates are required" };
  }

  const sourceRows = forecast.slice(0, 3).map((item) => ({
    year: Number(item.year),
    eps: Number(item.eps)
  }));
  const forecastYears = sourceRows.map((item) => item.year);
  if (!forecastYears.every((year, index) => index === 0 || year === forecastYears[index - 1] + 1)) {
    return { valid: false, reason: "The three EPS estimate years must be consecutive" };
  }
  const retrievedYear = new Date(row.retrievedAt).getUTCFullYear();
  if (forecastYears[0] < retrievedYear) {
    return { valid: false, reason: "The first EPS estimate year is already in the past" };
  }
  if (sourceRows.some((item) => item.eps <= 0)) {
    return { valid: false, reason: "The forward P/E model requires positive EPS in all three estimate years" };
  }

  const periods = sourceRows.length - 1;
  const growth = (sourceRows[sourceRows.length - 1].eps / sourceRows[0].eps) ** (1 / periods) - 1;
  const storedGrowth = numberOrNull(row.consensusEpsCagr);
  if (storedGrowth === null || Math.abs(storedGrowth - growth) > 0.00001) {
    return { valid: false, reason: "The stored EPS forecast CAGR does not reconcile to the three published EPS estimates" };
  }

  const reportedCurrency = row.reportedCurrency ?? row.currency;
  const fx = getFxAudit(reportedCurrency);
  if (!fx.valid) {
    return { valid: false, reason: `EPS currency conversion unavailable: ${fx.reason}`, fx };
  }
  const rateToSek = fx.rateToSek;
  const forecastRows = sourceRows.map((item) => ({
    ...item,
    epsSek: item.eps * rateToSek
  }));

  return {
    valid: true,
    growth,
    periods,
    sourceRows,
    forecastRows,
    firstEstimateYear: forecastRows[0].year,
    lastEstimateYear: forecastRows[forecastRows.length - 1].year,
    reportedCurrency,
    displayCurrency: "SEK",
    fx,
    currencyEvidence: row.currencyEvidence ?? null,
    sourceUrl: row.sourceUrl,
    retrievedAt: row.retrievedAt,
    ageDays
  };
}

function applyMarketScreenerForecastGrowth(companies, rows) {
  return companies.map((company) => {
    const category = normalizeCompanyType(company.companyType, company.ticker);
    const epsAudit = category === "investment"
      ? { valid: false, notApplicable: true, reason: "NAV is used instead of P/E for investment companies" }
      : getMarketScreenerEpsForecastAudit(rows?.[company.id]);
    if (category === "bank" || category === "investment") {
      return {
        ...company,
        consensusGrowth: null,
        consensusGrowthSource: "Not applicable for this company type",
        consensusGrowthAsOf: null,
        consensusGrowthAudit: { valid: false, notApplicable: true },
        consensusEpsAudit: epsAudit
      };
    }

    const audit = getMarketScreenerForecastAudit(rows?.[company.id]);
    return {
      ...company,
      consensusGrowth: audit.valid ? audit.growth * 100 : null,
      consensusGrowthSource: audit.valid ? "MarketScreener three-year analyst-consensus FCF forecast" : null,
      consensusGrowthAsOf: audit.valid ? audit.retrievedAt : null,
      consensusGrowthAudit: audit,
      consensusEpsAudit: epsAudit
    };
  });
}

function normalizeHistoricalFcfRows(rows) {
  if (!Array.isArray(rows)) return [];
  const byYear = new Map();
  rows.forEach((item) => {
    const year = Number(item?.year);
    const fcf = numberOrNull(item?.fcf ?? item?.freeCashFlow);
    if (!Number.isInteger(year) || fcf === null) return;
    byYear.set(year, {
      ...item,
      year,
      fcf,
      sourceName: item?.sourceName ?? null,
      sourceUrl: item?.sourceUrl ?? null
    });
  });
  return [...byYear.values()].sort((left, right) => left.year - right.year);
}

function validateHistoricalFcfSeries(rows, metadata = {}) {
  const normalized = normalizeHistoricalFcfRows(rows).slice(-6);
  if (normalized.length < 2) {
    return { valid: false, reason: "At least two annual FCF observations are required" };
  }

  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].year !== normalized[index - 1].year + 1) {
      return { valid: false, reason: "The annual FCF history has a missing fiscal year" };
    }
  }

  const oldest = normalized[0];
  const latest = normalized[normalized.length - 1];
  const years = latest.year - oldest.year;
  if (years < 1) return { valid: false, reason: "The FCF history does not span a full fiscal year" };
  const metadataResult = {
    rows: normalized,
    oldest,
    latest,
    years,
    currency: metadata.currency ?? "SEK",
    unit: metadata.unit ?? null,
    source: metadata.source ?? "Source unavailable",
    sourceUrl: metadata.sourceUrl ?? null,
    updatedAt: metadata.updatedAt ?? null,
    sourceKind: metadata.sourceKind ?? "unknown",
    fx: metadata.fx ?? getFxAudit(metadata.currency ?? "SEK"),
    currencyEvidence: metadata.currencyEvidence ?? null
  };
  if (oldest.fcf <= 0 || latest.fcf <= 0) {
    return { ...metadataResult, valid: false, reason: "CAGR requires positive FCF in both the first and last fiscal year" };
  }

  const cagr = (latest.fcf / oldest.fcf) ** (1 / years) - 1;
  const supplied = numberOrNull(metadata.suppliedCagr);
  if (supplied !== null && Math.abs(supplied - cagr) > 0.00001) {
    return { valid: false, reason: "The stored CAGR does not reconcile to the displayed annual FCF values" };
  }

  return {
    ...metadataResult,
    valid: true,
    cagr,
  };
}

function getHistoricalFcfAudit(company, fallbackRow) {
  const category = normalizeCompanyType(company.companyType, company.ticker);
  if (category === "bank" || category === "investment") {
    return {
      valid: false,
      notApplicable: true,
      reason: "Ordinary free-cash-flow CAGR is not meaningful for this company type"
    };
  }

  const officialRows = normalizeHistoricalFcfRows(company.fcfHistory);
  if (officialRows.length) {
    return validateHistoricalFcfSeries(officialRows, {
      suppliedCagr: numberOrNull(company.growth5y) === null ? null : Number(company.growth5y) / 100,
      currency: company.fcfHistoryCurrency ?? company.quoteCurrency ?? "SEK",
      unit: company.fcfHistoryUnit ?? null,
      source: company.growth5ySource ?? "Official company reports (independently verified)",
      sourceUrl: company.growth5ySourceUrl ?? company.officialSource?.sourceUrl ?? null,
      updatedAt: company.growth5yUpdatedAt ?? company.dataUpdatedAt ?? null,
      sourceKind: "official"
    });
  }

  if (!fallbackRow) {
    return { valid: false, reason: "No annual free-cash-flow history is available" };
  }
  if (!fallbackRow.sourceUrl || !fallbackRow.retrievedAt) {
    return { valid: false, reason: "The fallback history is missing its source link or retrieval date" };
  }
  return validateHistoricalFcfSeries(fallbackRow.fcfHistory, {
    suppliedCagr: fallbackRow.historicalFcfCagr,
    currency: fallbackRow.reportedCurrency ?? fallbackRow.currency,
    unit: fallbackRow.unit ?? "million",
    source: "MarketScreener reported FCF history (fallback)",
    sourceUrl: fallbackRow.sourceUrl,
    updatedAt: fallbackRow.retrievedAt,
    sourceKind: "third-party-fallback",
    fx: getFxAudit(fallbackRow.reportedCurrency ?? fallbackRow.currency),
    currencyEvidence: fallbackRow.currencyEvidence ?? null
  });
}

function applyHistoricalFcfGrowth(companies, rows) {
  return companies.map((company) => {
    const audit = getHistoricalFcfAudit(company, rows?.[company.id]);
    return {
      ...company,
      growth5y: audit.valid ? audit.cagr * 100 : null,
      growth5yYears: audit.valid ? audit.years : null,
      growth5ySource: audit.valid ? audit.source : null,
      growth5ySourceUrl: audit.valid ? audit.sourceUrl : null,
      growth5yUpdatedAt: audit.valid ? audit.updatedAt : null,
      historicalFcfAudit: audit
    };
  });
}

async function loadMarketScreenerFcf() {
  try {
    const cacheBuster = Date.now();
    const [response, fxResponse] = await Promise.all([
      fetch(`${MARKETSCREENER_DATA_URL}?t=${cacheBuster}`, { cache: "no-store" }),
      fetch(`${FX_DATA_URL}?t=${cacheBuster}`, { cache: "no-store" }).catch(() => null)
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    riksbankFx = fxResponse?.ok ? await fxResponse.json() : null;
    marketScreenerFcf = payload?.companies ?? null;
    state.companies = applyMarketScreenerForecastGrowth(state.companies, marketScreenerFcf);
    state.companies = applyHistoricalFcfGrowth(state.companies, marketScreenerFcf);
    renderAll();
  } catch (error) {
    marketScreenerFcf = null;
    riksbankFx = null;
    state.companies = applyMarketScreenerForecastGrowth(state.companies, null);
    state.companies = applyHistoricalFcfGrowth(state.companies, null);
    renderAll();
  }
}

function initialize() {
  populateSectorFilter();
  bindEvents();
  renderAll();
  loadMarketData({ quiet: true });
  loadMarketScreenerFcf();
}

function populateSectorFilter() {
  const sectors = [...new Set(state.companies.map((company) => company.sector))].sort();
  elements.sectorFilter.innerHTML = [
    `<option value="all">All sectors</option>`,
    ...sectors.map((sector) => `<option value="${escapeHtml(sector)}">${escapeHtml(sector)}</option>`)
  ].join("");
}

function bindEvents() {
  elements.companyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-company-id]");
    if (!button) return;
    state.selectedId = button.dataset.companyId;
    renderAll();
  });

  elements.syntheticPortfolio.addEventListener("click", (event) => {
    const button = event.target.closest("[data-company-id]");
    if (!button) return;
    state.selectedId = button.dataset.companyId;
    renderAll();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderCompanyList();
  });

  elements.sectorFilter.addEventListener("change", (event) => {
    state.filters.sector = event.target.value;
    renderCompanyList();
  });

  elements.typeFilter.addEventListener("change", (event) => {
    state.filters.companyType = event.target.value;
    renderCompanyList();
  });

  elements.stanceFilter.addEventListener("change", (event) => {
    state.filters.stance = event.target.value;
    renderCompanyList();
  });

  document.querySelectorAll("[data-growth-assumption]").forEach((button) => {
    button.addEventListener("click", () => {
      state.growthAssumption = button.dataset.growthAssumption === "consensus" ? "consensus" : "cagr";
      saveCompanies();
      renderAll();
      showToast(`${state.growthAssumption === "consensus" ? "Market consensus" : "CAGR"} selected as the growth forecast`);
    });
  });

  document.addEventListener("input", (event) => {
    const company = getSelectedCompany();
    const field = event.target.dataset.field;
    const quality = event.target.dataset.quality;
    const meta = event.target.dataset.meta;
    if (!field && !quality && !meta) return;
    if (meta && company) {
      company[meta] = event.target.value;
      saveCompanies();
      renderForm();
      renderDependentViews();
      return;
    }

    if (field) {
      company[field] = field === "notes"
        ? event.target.value
        : (field === "dcfGrowth" ? numberOrNull(event.target.value) : asNumber(event.target.value));
      if (field === "marketPrice" || field === "eps") {
        company.targetPe = getCurrentPeRatio(company);
        const targetPeInput = document.querySelector('[data-field="targetPe"]');
        if (targetPeInput) targetPeInput.value = roundFieldValue(company.targetPe);
      }
      company.source = "Edited";
    }

    if (quality) {
      company[quality] = asNumber(event.target.value);
      company.source = "Edited";
    }

    saveCompanies();
    renderDependentViews();
  });




  document.querySelectorAll("[data-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      state.scenario = button.dataset.scenario;
      document.querySelectorAll("[data-scenario]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.scenario === state.scenario);
      });
      renderDependentViews();
    });
  });

  document.querySelectorAll("[data-model-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.analysisModel = button.dataset.modelView;
      document.querySelectorAll("[data-model-view]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderMetrics();
      drawDcfChart();
    });
  });

  elements.resetSelectedBtn.addEventListener("click", () => {
    const selected = getSelectedCompany();
    if (!selected) return;
    if (!window.confirm(`Reset ${selected.name} to sample inputs?`)) return;
    const defaults = createDefaultCompanies();
    const defaultCompany = defaults.find((company) => company.id === selected.id);
    if (!defaultCompany) return;
    state.companies = state.companies.map((company) => company.id === selected.id ? defaultCompany : company);
    saveCompanies();
    renderAll();
    showToast(`${selected.name} reset`);
  });

  elements.resetAllBtn.addEventListener("click", () => {
    if (!window.confirm("Reset all OMXS30 sample inputs?")) return;
    state.companies = createDefaultCompanies();
    state.selectedId = state.companies[0].id;
    saveCompanies();
    renderAll();
    showToast("All sample inputs reset");
  });
}

function renderAll() {
  if (marketScreenerFcf) {
    state.companies = applyMarketScreenerForecastGrowth(state.companies, marketScreenerFcf);
    state.companies = applyHistoricalFcfGrowth(state.companies, marketScreenerFcf);
  }
  renderDataStatus();
  renderCompanyList();
  renderForm();
  renderDependentViews();
}

function renderDependentViews() {
  renderGrowthAssumptionControl();
  renderHeader();
  renderMetrics();
  renderRiktkurser();
  renderSyntheticPortfolio();
  renderFundamentals();
  renderCompanyList();
  drawDcfChart();
}

function renderGrowthAssumptionControl() {
  document.querySelectorAll("[data-growth-assumption]").forEach((button) => {
    const active = button.dataset.growthAssumption === state.growthAssumption;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderHeader() {
  const company = getSelectedCompany();
  if (!company) return;

  const calc = calculateCompany(company);
  const category = normalizeCompanyType(company.companyType, company.ticker);
  const logoUrl = getCompanyHeroLogoUrl(company);
  elements.selectedTicker.textContent = company.ticker;
  elements.selectedLogo.textContent = "Logo PNG";
  elements.selectedLogoImage.hidden = false;
  elements.selectedLogoImage.closest(".selected-logo-image-wrap")?.classList.remove("is-missing");
  elements.selectedLogoImage.dataset.usedFallback = "false";
  elements.selectedLogoImage.dataset.logoFit = getCompanyLogoFit(company);
  elements.selectedLogoImage.dataset.heroFit = getCompanyHeroLogoFit(company);
  elements.selectedLogoImage.dataset.fallbackLogo = getCompanyLogoFallbackUrl(company);
  elements.selectedLogoImage.alt = `${company.name} logo`;
  elements.selectedLogoImage.onload = handleLogoLoad;
  elements.selectedLogoImage.onerror = handleLogoError;
  elements.selectedLogoImage.src = logoUrl;
  elements.selectedName.textContent = company.name;
  elements.selectedMeta.textContent = `${company.ticker} | Nasdaq Stockholm | ${company.sector} | ${getCompanyTypeShortLabel(category)} | ${getCompanySourceLabel(company)}`;
  elements.inputBadge.textContent = company.fundamentalsUsable === false
    ? (company.dataQuality?.status === "unverified" ? "Not independently verified" : "Fundamentals rejected")
    : (category !== "operating"
      ? getCompanyModelLabel(category)
      : (company.source !== "Sample input" && company.source !== "Edited" ? "Fundamentals loaded" : (company.source === "Edited" ? "Edited inputs" : "Sample inputs")));
  elements.stanceBadge.textContent = calc.stance.label;
  elements.stanceBadge.className = `status-badge ${calc.stance.key}`;
}

function renderDataStatus() {
  const priceTimestamp = formatDateTime(state.marketData.pricesGeneratedAt);
  const fundamentalsTimestamp = formatDateTime(state.marketData.fundamentalsGeneratedAt);
  const targetTimestamp = formatDateTime(state.marketData.targetPricesGeneratedAt);
  const timestamp = [
    priceTimestamp ? `Prices ${priceTimestamp}` : null,
    fundamentalsTimestamp ? `Fundamentals ${fundamentalsTimestamp}` : null,
    targetTimestamp ? `Target prices ${targetTimestamp}` : null
  ].filter(Boolean).join(" | ") || "Run the updaters to load market data";

  const source = [
    state.marketData.pricesProvider,
    state.marketData.fundamentalsProvider,
    state.marketData.targetPricesProvider
  ].filter(Boolean).join(" + ") || "Sample inputs";

  elements.dataStatus.textContent = state.marketData.status;
  elements.dataTimestamp.textContent = timestamp;
  elements.footerDataNote.textContent = state.marketData.pricesLoaded || state.marketData.fundamentalsLoaded || state.marketData.targetPricesLoaded
    ? `Market data: ${source}. ${timestamp}.`
    : "OMXS30 seed composition: 2025-07-01.";
  elements.tickerSnapshot.textContent = `Snapshot: ${timestamp}`;
  if (elements.tickerSource) {
    elements.tickerSource.textContent = `Source: ${source}`;
  }
}

function renderCompanyList(updateHtml = true) {
  if (!updateHtml) {
    updateActiveCompanyRow();
    return;
  }

  const filtered = state.companies
    .map((company) => ({ company, calc: calculateCompany(company, "base") }))
    .filter(({ company, calc }) => {
      const query = state.filters.search;
      const category = normalizeCompanyType(company.companyType, company.ticker);
      const matchesQuery = !query || `${company.ticker} ${company.name}`.toLowerCase().includes(query);
      const matchesSector = state.filters.sector === "all" || company.sector === state.filters.sector;
      const matchesType = state.filters.companyType === "all" || category === state.filters.companyType;
      const matchesStance = state.filters.stance === "all" || calc.stance.key === state.filters.stance;
      return matchesQuery && matchesSector && matchesType && matchesStance;
    })
    .sort((left, right) => {
      const batchDiff = getCompanyBatch(left.company.ticker) - getCompanyBatch(right.company.ticker);
      if (batchDiff !== 0) return batchDiff;
      return right.calc.researchScore - left.calc.researchScore;
    });

  elements.companyList.innerHTML = filtered.map(({ company, calc }) => {
    const mosClass = calc.marginOfSafety >= 0 ? "is-positive" : "is-negative";
    const trailingPe = getDisplayTrailingPe(company);
    const peSource = company.fundamentals?.trailingPeSource ?? "Market price / trailing EPS";
    return `
      <button class="company-row ${company.id === state.selectedId ? "is-active" : ""}" type="button" data-company-id="${company.id}" data-logo-fit="${escapeHtml(getCompanyLogoFit(company))}">
        <span class="company-price">
          <strong>${formatPriceNumber(asNumber(company.marketPrice))}</strong>
          <small>${escapeHtml(company.currency ?? "SEK")}</small>
          <span class="company-pe" title="${escapeHtml(peSource)}">P/E ${trailingPe === null ? "N/A" : `${formatDecimal(trailingPe, 1)}x`}</span>
        </span>
        <span class="company-main">
          <span class="company-logo-mark">
            ${logoImageMarkup(company, "company-logo-image")}
          </span>
          <span class="company-text">
            <span class="company-name">${escapeHtml(getCompanyWordmark(company))}</span>
            <span class="company-ticker">${escapeHtml(company.ticker)} | ${escapeHtml(getCompanyTypeShortLabel(normalizeCompanyType(company.companyType, company.ticker)))}</span>
          </span>
        </span>
        <span class="company-side">
          <strong class="${mosClass}">${formatPercent(calc.marginOfSafety, 0)}</strong>
          <small>${calc.stance.label}</small>
        </span>
      </button>
    `;
  }).join("") || `<div class="company-row" role="status">No matches</div>`;
}

function updateActiveCompanyRow() {
  elements.companyList.querySelectorAll("[data-company-id]").forEach((row) => {
    row.classList.toggle("is-active", row.dataset.companyId === state.selectedId);
  });
}

function roundFieldValue(raw) {
  if (raw === null || raw === undefined || raw === "") return "";
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  // Keep the stored precision, but never show float noise in the form.
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}`;
}

function renderForm() {

  const company = getSelectedCompany();
  if (!company) return;

  document.querySelectorAll("[data-field]").forEach((input) => {
    if (input.dataset.field === "normalizedFcfPerShare" && normalizeCompanyType(company.companyType, company.ticker) === "cyclical") {
      const normalization = getCyclicalHistoryNormalization(company);
      input.value = roundFieldValue(normalization.valid ? normalization.perShare : null);
      input.title = normalization.valid
        ? `Median of ${normalization.observations} official-report years (${normalization.firstYear}–${normalization.lastYear})`
        : normalization.reason;
    } else {
      input.value = roundFieldValue(company[input.dataset.field]);
    }
  });


  document.querySelectorAll("[data-quality]").forEach((input) => {
    input.value = company[input.dataset.quality] ?? 3;
  });

  document.querySelectorAll("[data-meta]").forEach((input) => {
    input.value = company[input.dataset.meta] ?? "";
  });

  renderGrowthMeta(company);
  renderCagrBreakdown(company);
  renderConsensusGrowthBreakdown(company);
}

function formatShortDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function daysSince(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function renderGrowthMeta(company) {
  const cagrMeta = document.querySelector("#growth5yMeta");
  if (cagrMeta) {
    const audit = company.historicalFcfAudit ?? getHistoricalFcfAudit(company, marketScreenerFcf?.[company?.id]);
    if (audit?.notApplicable) {
      cagrMeta.textContent = "N/A — use EPS/book-value growth for banks and NAV growth for investment companies";
    } else if (!audit?.valid) {
      cagrMeta.textContent = `Unavailable — ${audit?.reason ?? "no validated annual FCF history"}`;
    } else {
      const source = audit.sourceKind === "official" ? "Verified official reports" : "MarketScreener fallback";
      const fx = audit.fx?.valid && !audit.fx.noConversion
        ? ` | ${audit.currency}→SEK ${audit.fx.rateToSek.toFixed(5)} (${audit.fx.rateDate})`
        : "";
      cagrMeta.textContent = `${audit.years}yr CAGR (${audit.oldest.year}–${audit.latest.year}) | ${source}${fx} | Updated: ${formatShortDate(audit.updatedAt) ?? "n/a"}`;
    }
  }

  const consensusMeta = document.querySelector("#consensusGrowthMeta");
  if (consensusMeta) {
    const audit = company.consensusGrowthAudit ?? getMarketScreenerForecastAudit(marketScreenerFcf?.[company?.id]);
    if (audit?.notApplicable) {
      consensusMeta.textContent = "N/A — use EPS/book-value growth for banks and NAV growth for investment companies";
    } else if (!audit?.valid) {
      consensusMeta.textContent = `Unavailable — ${audit?.reason ?? "no validated three-estimate forecast"}`;
    } else {
      const asOf = formatShortDate(audit.retrievedAt);
      consensusMeta.innerHTML =
        `${audit.firstEstimateYear}E → ${audit.lastEstimateYear}E | ${audit.periods}yr forecast CAGR | ` +
        `<a href="${escapeHtml(audit.sourceUrl)}" target="_blank" rel="noopener">MarketScreener cash-flow forecast</a>` +
        (audit.fx?.valid && !audit.fx.noConversion
          ? ` | ${escapeHtml(audit.currency)}→SEK ${audit.fx.rateToSek.toFixed(5)} (${escapeHtml(audit.fx.rateDate)})`
          : "") +
        (asOf ? ` | Retrieved ${escapeHtml(asOf)}` : "");
    }
  }
}

function formatConsensusFcf(value, audit) {
  if (!Number.isFinite(value)) return "n/a";
  const formatted = Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${formatted} ${audit.unit ?? "million"} ${audit.currency ?? "SEK"}`;
}

function formatSekEquivalent(value, audit) {
  if (!Number.isFinite(value) || !audit?.fx?.valid || audit.fx.noConversion) return null;
  const converted = value * audit.fx.rateToSek;
  return `${converted.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${audit.unit ?? "million"} SEK`;
}

function renderFcfValue(value, audit) {
  const sourceValue = escapeHtml(formatConsensusFcf(value, audit));
  const sekValue = formatSekEquivalent(value, audit);
  return sekValue
    ? `<span class="fcf-source-value">${sourceValue}</span><small class="fx-equivalent">≈ ${escapeHtml(sekValue)}</small>`
    : `<span class="fcf-source-value">${sourceValue}</span>`;
}

function renderFxDisclosure(audit) {
  const currency = audit?.reportedCurrency ?? audit?.currency ?? "unknown currency";
  const currencyEvidence = audit?.currencyEvidence;
  const evidenceLink = currencyEvidence?.sourceUrl
    ? `<a href="${escapeHtml(currencyEvidence.sourceUrl)}" target="_blank" rel="noopener">official company report</a>`
    : "official company report";
  if (currency === "SEK") {
    return `<p class="fx-disclosure"><strong>Currency:</strong> MarketScreener values are reported in SEK, cross-checked against the ${evidenceLink}. No FX conversion is applied.</p>`;
  }
  if (!audit?.fx?.valid) {
    return `<p class="fx-disclosure is-warning"><strong>Currency:</strong> MarketScreener values are reported in ${escapeHtml(currency)}, cross-checked against the ${evidenceLink}. SEK equivalents are unavailable because ${escapeHtml(audit?.fx?.reason ?? "the official reference rate could not be validated")}.</p>`;
  }
  const sourceLink = audit.fx.sourceUrl
    ? `<a href="${escapeHtml(audit.fx.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(audit.fx.sourceName)}</a>`
    : escapeHtml(audit.fx.sourceName);
  return `<p class="fx-disclosure"><strong>Currency:</strong> MarketScreener values are reported in ${escapeHtml(currency)}, cross-checked against the ${evidenceLink}. SEK equivalents use the indicative ${sourceLink} reference rate: <strong>1 ${escapeHtml(currency)} = ${audit.fx.rateToSek.toFixed(5)} SEK</strong>, dated ${escapeHtml(audit.fx.rateDate)} and retrieved ${escapeHtml(formatShortDate(audit.fx.retrievedAt) ?? "date unavailable")}. Rates refresh each weekday and are rejected when more than seven days old. The growth percentage is calculated from the source-currency values, so FX does not change it.</p>`;
}

function renderConsensusGrowthBreakdown(company) {
  const container = document.querySelector("#consensusGrowthBreakdown");
  const details = document.querySelector("#consensusGrowthDetails");
  if (!container || !details) return;

  const audit = company.consensusGrowthAudit ?? getMarketScreenerForecastAudit(marketScreenerFcf?.[company?.id]);
  if (audit?.notApplicable) {
    container.innerHTML = "<p class=\"cagr-note\">FCF growth is not used for this company type.</p>";
    details.open = false;
    return;
  }
  if (!audit?.valid && !audit?.rows?.length) {
    container.innerHTML = `<p class="cagr-note">${escapeHtml(audit?.reason ?? "No validated MarketScreener forecast is available.")}</p>`;
    details.open = false;
    return;
  }

  const percentage = audit.growth * 100;
  const displayedRows = [
    ...audit.forecastRows.map((row) => ({ ...row, basis: "Analyst consensus" })),
    ...audit.projectionRows.map((row) => ({ ...row, basis: "Dashboard CAGR extension" }))
  ];
  details.open = true;
  container.innerHTML = `
    <table class="cagr-table">
      <thead><tr><th>Period</th><th>Free cash flow</th><th>Basis</th></tr></thead>
      <tbody>
        ${displayedRows.map((row) => `<tr><td>${row.year}E</td><td>${renderFcfValue(row.fcf, audit)}</td><td>${escapeHtml(row.basis)}</td></tr>`).join("")}
      </tbody>
    </table>
    <p class="cagr-formula">Forecast CAGR = (${escapeHtml(formatConsensusFcf(audit.lastEstimateFcf, audit))} ÷ ${escapeHtml(formatConsensusFcf(audit.firstEstimateFcf, audit))})<sup>1/${audit.periods}</sup> − 1 = <strong>${percentage.toFixed(2)} %</strong></p>
    ${renderFxDisclosure(audit)}
    <p class="cagr-note">Years 1–3 use the three published analyst-consensus FCF estimates. Years 4–5 extend the final estimate using the displayed forecast CAGR. The DCF converts each amount to SEK per share using the disclosed FX rate and official outstanding shares · <a href="${escapeHtml(audit.sourceUrl)}" target="_blank" rel="noopener">Open MarketScreener source</a> · Retrieved ${escapeHtml(formatShortDate(audit.retrievedAt) ?? "date unavailable")}.</p>`;
}

function formatFcfAmount(value, currency = "SEK") {
  if (!Number.isFinite(value)) return "n/a";
  const abs = Math.abs(value);
  const units = [[1e9, "bn"], [1e6, "m"], [1e3, "k"]];
  for (const [size, suffix] of units) {
    if (abs >= size) return `${(value / size).toFixed(2)} ${suffix} ${currency}`;
  }
  return `${value.toFixed(0)} ${currency}`;
}

function formatHistoricalFcf(value, audit) {
  if (!Number.isFinite(value)) return "n/a";
  if (audit?.unit === "per-share") {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${audit.currency ?? "SEK"}/share`;
  }
  if (audit?.unit === "million") {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} million ${audit.currency ?? "SEK"}`;
  }
  return formatFcfAmount(value, audit?.currency ?? "SEK");
}

function historicalComponent(value, audit) {
  return Number.isFinite(Number(value)) ? formatHistoricalFcf(Number(value), audit) : "—";
}

function renderHistoricalMethod(row) {
  const label = escapeHtml(row.methodLabel ?? row.calculation ?? "Reported cash-flow measure");
  const definition = row.definition ? `<small class="cagr-method-note">${escapeHtml(row.definition)}</small>` : "";
  const reportedUnit = row.reportedUnit ? ` ${row.reportedUnit}` : "";
  const reportedFormula = row.method === "cfo-minus-capex"
    ? `${Number(row.reportedOperatingCashFlow).toLocaleString("en-US")} − ${Number(row.reportedCapitalExpenditures).toLocaleString("en-US")} = ${Number(row.reportedFreeCashFlow).toLocaleString("en-US")}${reportedUnit}`
    : `${Number(row.reportedFreeCashFlow).toLocaleString("en-US")}${reportedUnit}`;
  const fxNote = Number(row.financialToQuoteFx) !== 1
    ? ` · 1 ${row.reportedCurrency} = ${Number(row.financialToQuoteFx).toFixed(5)} ${row.quoteCurrency}`
    : "";
  const reported = `<small class="cagr-method-note">Reported: ${escapeHtml(reportedFormula + fxNote)}</small>`;
  const sourcePage = row.sourcePage ? `, p. ${escapeHtml(String(row.sourcePage))}` : "";
  const evidence = row.sourceUrl
    ? `<a href="${escapeHtml(row.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(row.sourceName ?? "official report")}${sourcePage}</a>`
    : "Official report";
  return `<span>${label}</span>${definition}${reported}<small class="cagr-method-note">${evidence}</small>`;
}

function renderHistoricalFcfValue(value, audit) {
  const sourceValue = escapeHtml(formatHistoricalFcf(value, audit));
  const sekValue = formatSekEquivalent(value, audit);
  return sekValue
    ? `<span class="fcf-source-value">${sourceValue}</span><small class="fx-equivalent">≈ ${escapeHtml(sekValue)}</small>`
    : `<span class="fcf-source-value">${sourceValue}</span>`;
}

function renderCagrBreakdown(company) {
  const host = document.querySelector("#cagrBreakdown");
  if (!host) return;

  const audit = company.historicalFcfAudit ?? getHistoricalFcfAudit(company, marketScreenerFcf?.[company?.id]);
  if (audit?.notApplicable) {
    host.innerHTML = `<p class="cagr-note">${escapeHtml(audit.reason)}. The dashboard therefore leaves historical FCF CAGR blank.</p>`;
    return;
  }
  if (!audit?.valid) {
    host.innerHTML = `
      <p class="cagr-note">Historical FCF CAGR is unavailable: ${escapeHtml(audit?.reason ?? "no validated annual history")}. No estimate is substituted.</p>
      <p class="cagr-note">Official company-report history is preferred. MarketScreener actual-year figures are used only as a clearly labelled fallback.</p>`;
    return;
  }

  const rows = audit.rows
    .map((row, index) => {
      const previous = index > 0 ? audit.rows[index - 1] : null;
      const yoyValue = previous && previous.fcf > 0 && row.fcf > 0 ? (row.fcf / previous.fcf - 1) * 100 : null;
      const yoy = yoyValue === null
        ? '<span class="cagr-na">n/a</span>'
        : `<span class="${yoyValue >= 0 ? "cagr-up" : "cagr-down"}">${yoyValue >= 0 ? "+" : ""}${yoyValue.toFixed(1)} %</span>`;
      const officialComponents = audit.sourceKind === "official" && row.method === "cfo-minus-capex";
      return `<tr>
        <td>${escapeHtml(row.fiscalLabel ?? `${row.year}A`)}</td>
        <td>${officialComponents ? escapeHtml(historicalComponent(row.operatingCashFlow, audit)) : "—"}</td>
        <td>${officialComponents ? escapeHtml(historicalComponent(row.capitalExpenditures, audit)) : "—"}</td>
        <td>${renderHistoricalFcfValue(row.fcf, audit)}</td>
        <td>${yoy}</td>
        <td class="cagr-method">${audit.sourceKind === "official" ? renderHistoricalMethod(row) : "MarketScreener fallback"}</td>
      </tr>`;
    })
    .join("");

  const sourceLink = audit.sourceUrl
    ? `<a href="${escapeHtml(audit.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(audit.source)}</a>`
    : escapeHtml(audit.source);
  const percentage = audit.valid ? audit.cagr * 100 : null;
  const historyNote = audit.sourceKind === "official"
    ? "Independently verified annual figures from official company reports."
    : "Temporary third-party fallback because a verified official annual series is not stored yet.";

  host.innerHTML = `
    <div class="cagr-head">
      <div>
        <span class="cagr-label">${audit.rows.length} observations · ${audit.years}-year FCF CAGR (${audit.oldest.year}–${audit.latest.year})</span>
        <strong class="cagr-value">${percentage === null ? "N/A" : `${percentage.toFixed(2)} %`}</strong>
      </div>
      <p class="cagr-note">Source: ${sourceLink} | Retrieved/verified: ${escapeHtml(formatShortDate(audit.updatedAt) ?? "n/a")}</p>
    </div>
    <table class="cagr-table">
      <thead><tr><th>Period</th><th>CFO</th><th>Capex</th><th>FCF</th><th>Growth</th><th>Method &amp; evidence</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${percentage === null
      ? `<p class="cagr-formula"><strong>CAGR: N/A.</strong> ${escapeHtml(audit.reason)}</p>`
      : `<p class="cagr-formula">CAGR = (FCF<sub>${audit.latest.year}</sub> ÷ FCF<sub>${audit.oldest.year}</sub>)<sup>1/${audit.years}</sup> − 1</p>
         <p class="cagr-formula">= (${escapeHtml(formatHistoricalFcf(audit.latest.fcf, audit))} ÷ ${escapeHtml(formatHistoricalFcf(audit.oldest.fcf, audit))})<sup>1/${audit.years}</sup> − 1 = <strong>${percentage.toFixed(2)} %</strong></p>`}
    ${renderFxDisclosure(audit)}
    <p class="cagr-note">${historyNote} “CFO − capex” rows show the two report inputs explicitly. A company-defined row is never presented as statutory CFO − capex. The years must be consecutive and the first and last FCF must be positive; otherwise the dashboard shows N/A. This CAGR is read-only and drives the DCF only when CAGR is selected in the page-level Growth forecast control.</p>
  `;
}


function getScenarioExplanation(scenario = state.scenario, model = state.analysisModel) {
  const usesConsensus = state.growthAssumption === "consensus";
  const growthLabel = usesConsensus ? "market-consensus FCF CAGR" : "historical FCF CAGR";
  if (model === "ev-ebitda") {
    if (scenario === "bull") return "Bull uses the saved EV/EBITDA multiple plus 0.7x.";
    if (scenario === "bear") return "Bear uses the saved EV/EBITDA multiple minus 0.7x.";
    return "Base uses the saved EV/EBITDA multiple without adjustment.";
  }
  if (model === "reverse-dcf") {
    if (scenario === "bull") return "Bull solves the market-implied growth rate using a required equity return 0.7 pp lower.";
    if (scenario === "bear") return "Bear solves the market-implied growth rate using a required equity return 1.0 pp higher.";
    return "Base solves the five-year growth rate implied by today’s price and the saved required equity return.";
  }
  if (model === "pe") {
    if (scenario === "bull") return "Bull keeps the three published EPS estimates, extends years 4–5 at their EPS CAGR +2.0 pp, uses current P/E +2.0x and lowers required equity return by 0.7 pp.";
    if (scenario === "bear") return "Bear keeps the three published EPS estimates, extends years 4–5 at their EPS CAGR −2.0 pp, uses current P/E −2.0x and raises required equity return by 1.0 pp.";
    return "Base uses three separately sourced analyst EPS estimates, extends years 4–5 at their EPS CAGR, applies the current P/E in year 5 and discounts the terminal price to today.";
  }
  if (usesConsensus) {
    if (scenario === "bull") return "Bull keeps the three published FCF estimates, extends years 4–5 at forecast CAGR +2.0 pp and lowers required equity return by 0.7 pp.";
    if (scenario === "bear") return "Bear keeps the three published FCF estimates, extends years 4–5 at forecast CAGR −2.0 pp and raises required equity return by 1.0 pp.";
    return "Base uses the three published FCF estimates, then extends years 4–5 with their forecast CAGR.";
  }
  if (scenario === "bull") return `Bull applies ${growthLabel} +2.0 pp and required equity return −0.7 pp.`;
  if (scenario === "bear") return `Bear applies ${growthLabel} −2.0 pp and required equity return +1.0 pp.`;
  return `Base uses the page-level ${growthLabel} choice and the saved required equity return.`;
}

function getAnalysisPresentation(company) {
  const currency = company.currency ?? "SEK";
  const scenario = state.scenario;
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const scenarioLabel = adjustment.label;
  const category = normalizeCompanyType(company.companyType, company.ticker);
  const price = asNumber(company.marketPrice);
  const currentFcf = asNumber(company.fcfPerShare);
  const growthAssumption = getSelectedGrowthAssumption(company);
  const baseDcfGrowth = growthAssumption.value;
  const growth = baseDcfGrowth === null ? NaN : baseDcfGrowth + adjustment.growth;
  const wacc = asNumber(company.wacc) + adjustment.wacc;
  const currentPe = getCurrentPeRatio(company);
  const targetPe = currentPe === null ? NaN : Math.max(0, currentPe + adjustment.targetPe);
  const difference = (value) => price > 0 && Number.isFinite(value) ? ((value - price) / price) * 100 : NaN;
  const differenceText = (value) => {
    const result = difference(value);
    if (!Number.isFinite(result)) return "Cannot calculate from current inputs";
    return `${formatPercent(result, 1)} ${result >= 0 ? "upside" : "downside"} vs current price`;
  };

  const bolidenModel = getSpecializedValuation(company, "boliden-commodity-cycle")
    ? calculateBolidenCommodityCycle(company, scenario)
    : null;
  const skanskaModel = getSpecializedValuation(company, "skanska-sotp")
    ? calculateSkanskaSotp(company, scenario)
    : null;

  if (category === "investment") {
    const nav = getInvestmentNavAudit(company);
    const hasDiscount = Number.isFinite(nav.discountToNav) && nav.discountToNav >= 0;
    const discountPremiumLabel = hasDiscount ? "Discount to NAV" : "Premium to NAV";
    const discountPremiumValue = Number.isFinite(nav.discountToNav)
      ? formatPercent(Math.abs(nav.discountToNav), 1)
      : "-";
    const sourcePeriod = nav.period ? formatShortDate(nav.period) : "latest reported period";
    return {
      key: "nav",
      title: "NAV discount / premium",
      note: "Investment companies are valued from their latest reported NAV or equity per share. DCF, Reverse DCF, P/E, EV/EBITDA, growth forecasts and scenarios are not used.",
      chartTitle: "Market price compared with reported NAV",
      chartSubtitle: `${nav.basis} from ${sourcePeriod}`,
      chartUnit: `${currency} / share`,
      modelTitle: "NAV — Net Asset Value",
      modelDescription: "NAV represents the reported value of the investment portfolio and other assets after liabilities. The dashboard compares the current share price with that value per share. A lower market price is a discount; a higher market price is a premium.",
      sourceUrl: nav.sourceUrl,
      sourceLabel: nav.sourceUrl ? `${nav.sourceName} · ${sourcePeriod}` : null,
      formula: "Discount / premium = (reported NAV per share − current share price) ÷ reported NAV per share",
      assumptions: [
        ["NAV basis", nav.basis],
        ["Reported period", sourcePeriod],
        ["Valuation weight", "100% reported NAV · 0% P/E · 0% DCF · 0% EV/EBITDA"],
        ["Target prices", "0% weight"],
        ["Interpretation", hasDiscount ? "The share trades below reported NAV" : "The share trades above reported NAV"]
      ],
      metrics: [
        ["Reported NAV / equity per share", formatTickerMoney(nav.navPerShare, currency), nav.basis],
        ["Current price", formatTickerMoney(nav.marketPrice, currency), "Latest market price"],
        [discountPremiumLabel, discountPremiumValue, "Compared directly with reported NAV"],
        ["Price / NAV", Number.isFinite(nav.priceToNav) ? `${formatDecimal(nav.priceToNav, 2)}x` : "-", "1.00x means price equals NAV"]
      ],
      chartValues: [
        { label: "Market price", value: nav.marketPrice },
        { label: "Reported NAV", value: nav.navPerShare }
      ]
    };
  }

  if (state.analysisModel === "pe") {
    const pe = calculateForwardPeModel(company, scenario);
    const suitability = pe.suitability ?? "P/E suitability cannot be assessed from current inputs.";
    const audit = pe.audit;
    const publishedEstimates = audit?.valid
      ? audit.forecastRows.map((row) => {
          const source = `${formatDecimal(row.eps, 3)} ${audit.reportedCurrency}/share`;
          const sek = `${formatDecimal(row.epsSek, 2)} SEK/share`;
          return `${row.year}E ${audit.reportedCurrency === "SEK" ? sek : `${source} = ${sek}`}`;
        }).join(" · ")
      : "Unavailable";
    const fxDescription = audit?.valid
      ? (audit.fx.noConversion
          ? "No conversion — estimates and share price are in SEK"
          : `1 ${audit.reportedCurrency} = ${formatDecimal(audit.fx.rateToSek, 5)} SEK · Sveriges Riksbank ${audit.fx.rateDate}`)
      : "Unavailable";
    return {
      key: "pe",
      title: `Forward P/E · ${scenarioLabel}`,
      note: Number.isFinite(pe.value) ? getScenarioExplanation(scenario, "pe") : pe.error,
      chartTitle: "Projected earnings per share",
      chartSubtitle: Number.isFinite(pe.value)
        ? `${scenarioLabel}: five-year EPS path before the terminal P/E is applied`
        : pe.error,
      chartUnit: `${currency} EPS`,
      modelTitle: "P/E — Forward Earnings Value",
      modelDescription: `${suitability} Years 1–3 come directly from the displayed analyst EPS estimates. Years 4–5 extend their EPS CAGR. FCF growth is never used in this model.`,
      sourceUrl: audit?.valid ? audit.sourceUrl : null,
      sourceLabel: audit?.valid ? `MarketScreener EPS estimates · retrieved ${formatShortDate(audit.retrievedAt)}` : null,
      formula: "EPS₄–₅ = final published EPS × (1 + EPS forecast CAGR); value today = EPS₅ × target P/E ÷ (1 + required equity return)⁵",
      assumptions: [
        ["Published EPS estimates", publishedEstimates],
        ["Published EPS CAGR", Number.isFinite(pe.publishedGrowth) ? formatPercent(pe.publishedGrowth, 1) : "Unavailable"],
        ["Years 4–5 extension", Number.isFinite(pe.extensionGrowth) ? `${formatPercent(pe.extensionGrowth, 1)} EPS CAGR` : "Unavailable"],
        ["Currency conversion", fxDescription],
        ["Target P/E in year 5", Number.isFinite(pe.targetPe) ? `${formatDecimal(pe.targetPe, 1)}x` : "Unavailable"],
        ["Required equity return", Number.isFinite(pe.requiredReturn) ? formatPercent(pe.requiredReturn * 100, 1) : "Unavailable"],
        ["Suitability", suitability]
      ],
      metrics: [
        ["Present value / share", formatTickerMoney(pe.value, currency), differenceText(pe.value)],
        ["Current price", formatTickerMoney(price, currency), "Market price input"],
        ["Forecast EPS · Year 5", Number.isFinite(pe.forecastEps) ? formatPerShareMoney(pe.forecastEps, currency) : "-", Number.isFinite(pe.extensionGrowth) ? `Years 4–5 extended at ${formatPercent(pe.extensionGrowth, 1)} EPS CAGR` : "Needs three EPS estimates"],
        ["Year-5 target P/E", Number.isFinite(pe.targetPe) ? `${formatDecimal(pe.targetPe, 1)}x` : "-", state.scenario === "base" ? "Current trailing P/E anchor" : `${formatDecimal(adjustment.targetPe, 1)}x scenario adjustment`]
      ],
      chartValues: [
        ...(Number.isFinite(pe.startingEps) ? [{ label: "Current", value: pe.startingEps }] : []),
        ...(pe.flows ?? []).map((flow) => ({ label: flow.label, value: flow.eps }))
      ]
    };
  }

  if (state.analysisModel === "ev-ebitda") {
    const isCyclical = category === "cyclical";
    const normalizedEbitda = bolidenModel?.normalizedEbitdaPerShare
      ?? (isCyclical ? numberOrNull(company.normalizedEbitdaPerShare) : numberOrNull(company.ebitdaPerShare));
    const targetMultiple = bolidenModel?.multiple
      ?? Math.max(0, asNumber(company.targetEvToEbitda) + adjustment.targetPe * 0.35);
    const value = skanskaModel
      ? NaN
      : (bolidenModel?.evEbitdaValue ?? calculateEbitdaValue(company, scenario, isCyclical));
    const currentMultiple = numberOrNull(company.fundamentals?.evToEbitda);
    const netDebtPerShare = numberOrNull(company.netDebtPerShare);
    const unavailableReason = skanskaModel
      ? "Skanska is valued with a construction and development SOTP. Consolidated EV/EBITDA would mix unlike businesses, so no number is fabricated here."
      : (isCyclical && normalizedEbitda === null
          ? "Normalized EBITDA has not been explicitly supported. Current-cycle EBITDA is never substituted silently."
          : "Cannot calculate from current inputs");
    return {
      key: "ev-ebitda",
      title: `${isCyclical ? "Normalized EV/EBITDA" : "EV/EBITDA"} · ${scenarioLabel}`,
      note: Number.isFinite(value) ? getScenarioExplanation(scenario, "ev-ebitda") : unavailableReason,
      chartTitle: "EV/EBITDA valuation compared with market price",
      chartSubtitle: Number.isFinite(value)
        ? `${formatDecimal(normalizedEbitda, 2)} ${currency} EBITDA/share × ${formatDecimal(targetMultiple, 1)}x − net debt/share`
        : unavailableReason,
      chartUnit: `${currency} / share`,
      modelTitle: "EV/EBITDA — Enterprise Value Multiple",
      modelDescription: skanskaModel
        ? unavailableReason
        : bolidenModel
          ? "Uses Boliden’s commodity-normalized EBITDA, applies the explicit scenario multiple, then subtracts net debt to reach equity value per share."
          : isCyclical
            ? "Uses explicitly normalized EBITDA for a full-cycle cross-check. It remains unavailable when normalized EBITDA has not been verified."
            : "Values the operating business before financing, then subtracts net debt to reach the value attributable to shareholders.",
      formula: "EBITDA / share × target EV/EBITDA − net debt / share = equity value / share",
      assumptions: [
        [isCyclical ? "Normalized EBITDA / share" : "EBITDA / share", formatTickerMoney(normalizedEbitda, currency)],
        ["Target EV/EBITDA", Number.isFinite(targetMultiple) ? `${formatDecimal(targetMultiple, 1)}x` : "-"],
        ["Net debt / share", formatTickerMoney(netDebtPerShare, currency)],
        ["Current EV/EBITDA", currentMultiple !== null ? `${formatDecimal(currentMultiple, 1)}x` : "N/A"]
      ],
      metrics: [
        ["EV/EBITDA value / share", formatTickerMoney(value, currency), Number.isFinite(value) ? differenceText(value) : unavailableReason],
        ["Current price", formatTickerMoney(price, currency), "Market price input"],
        [isCyclical ? "Normalized EBITDA / share" : "EBITDA / share", formatTickerMoney(normalizedEbitda, currency), isCyclical ? "Cycle-normalized input" : "Operating earnings before D&A"],
        ["Target EV/EBITDA", Number.isFinite(targetMultiple) ? `${formatDecimal(targetMultiple, 1)}x` : "-", state.scenario === "base" ? "Saved base assumption" : `${formatDecimal(adjustment.targetPe * 0.35, 1)}x scenario adjustment`]
      ],
      chartValues: [
        { label: "Current price", value: price },
        { label: `${scenarioLabel} value`, value }
      ]
    };
  }

  if (state.analysisModel === "dcf" && bolidenModel) {
    return {
      key: "dcf",
      title: `Boliden commodity-cycle valuation · ${scenarioLabel}`,
      note: "70% commodity-normalized EV/EBITDA + 30% mid-cycle FCF DCF. Analyst target prices have 0% weight.",
      chartTitle: "Two independent valuation components",
      chartSubtitle: "The displayed intrinsic value is the weighted result, not a target-price fit",
      chartUnit: `${currency} / share`,
      modelTitle: "Boliden — Commodity-cycle normalization",
      modelDescription: "Starts with reported EBITDA, adjusts it from near-term planning prices to Boliden’s long-term metal prices and exchange rates using the company’s published sensitivities, then applies an explicit EV/EBITDA assumption. The second component uses the selected forecast for years 1–3 and fades years 4–5 to the median official-report cash flow across the full cycle.",
      formula: "70% × commodity EV/EBITDA value + 30% × mid-cycle FCF DCF value",
      assumptions: [
        ["Reported EBITDA / share", formatTickerMoney(bolidenModel.currentEbitda / bolidenModel.shares, currency)],
        ["Commodity-cycle adjustment", formatTickerMoney(bolidenModel.operatingProfitAdjustmentSekm * 1e6 / bolidenModel.shares, currency)],
        ["Normalized EBITDA / share", formatTickerMoney(bolidenModel.normalizedEbitdaPerShare, currency)],
        ["Scenario EV/EBITDA", `${formatDecimal(bolidenModel.multiple, 1)}x`],
        ["Valuation weights", "70% EV/EBITDA · 30% DCF"],
        ["Target prices", "0% weight"]
      ],
      metrics: [
        ["Intrinsic value / share", formatTickerMoney(bolidenModel.value, currency), differenceText(bolidenModel.value)],
        ["Commodity EV/EBITDA", formatTickerMoney(bolidenModel.evEbitdaValue, currency), "70% configured weight"],
        ["Mid-cycle FCF DCF", formatTickerMoney(bolidenModel.dcf?.value, currency), "30% configured weight; years 4–5 return to normal"],
        ["Normalized EBITDA / share", formatTickerMoney(bolidenModel.normalizedEbitdaPerShare, currency), "Reported EBITDA plus the official sensitivity bridge"]
      ],
      chartValues: [
        { label: "Current price", value: price },
        { label: "EV/EBITDA", value: bolidenModel.evEbitdaValue },
        { label: "Mid-cycle DCF", value: bolidenModel.dcf?.value },
        { label: "Weighted value", value: bolidenModel.value }
      ]
    };
  }

  if (state.analysisModel === "dcf" && skanskaModel) {
    const chartComponents = skanskaModel.components.map((component) => ({
      label: component.label
        .replace("Construction franchise", "Construction")
        .replace("Residential development", "Residential")
        .replace("Commercial development", "Commercial")
        .replace("Investment properties", "Properties")
        .replace("PPP portfolio", "PPP")
        .replace("Adjusted net cash", "Net cash"),
      value: component.perShare
    }));
    const developmentPerShare = skanskaModel.components
      .filter((component) => !["Construction franchise", "Adjusted net cash"].includes(component.label))
      .reduce((sum, component) => sum + component.perShare, 0);
    return {
      key: "dcf",
      title: `Skanska sum of the parts · ${scenarioLabel}`,
      note: "Construction earnings, development assets, investment properties, PPP surplus and adjusted net cash are valued separately. Analyst target prices have 0% weight.",
      chartTitle: "Value contributed by each Skanska business",
      chartSubtitle: "Every bar is additive; together they equal the SOTP equity value",
      chartUnit: `${currency} / share`,
      modelTitle: "Skanska — Construction and development SOTP",
      modelDescription: "Skanska contains unlike businesses. The model values normalized Construction earnings with an EBIT multiple, values development and property assets from reported capital employed plus after-tax disclosed surplus values, and then adds adjusted net cash once.",
      formula: "Construction franchise + development NAV + properties + PPP surplus + adjusted net cash",
      assumptions: [
        ["Normalized Construction EBIT", `${formatDecimal(skanskaModel.normalizedConstructionEbit, 0)} SEK million`],
        ["Normalized central cost", `−${formatDecimal(skanskaModel.normalizedCentralCost, 0)} SEK million`],
        ["Construction EBIT multiple", `${formatDecimal(skanskaModel.constructionMultiple, 1)}x`],
        ["Development scenario factor", `${formatPercent((skanskaModel.developmentFactor - 1) * 100, 0)}`],
        ["Tax on disclosed surplus", `${formatPercent(skanskaModel.taxRate * 100, 0)}`],
        ["Target prices", "0% weight"]
      ],
      metrics: [
        ["SOTP value / share", formatTickerMoney(skanskaModel.value, currency), differenceText(skanskaModel.value)],
        ["Construction franchise", formatTickerMoney(skanskaModel.components[0]?.perShare, currency), "Normalized Construction EBIT after central cost"],
        ["Development and property NAV", formatTickerMoney(developmentPerShare, currency), "Reported capital plus after-tax disclosed surplus"],
        ["Adjusted net cash", formatTickerMoney(skanskaModel.components.at(-1)?.perShare, currency), "Added once at the end"]
      ],
      chartValues: [...chartComponents, { label: "Total SOTP", value: skanskaModel.value }]
    };
  }

  if (state.analysisModel === "reverse-dcf") {
    const reverse = category === "operating" ? calculateReverseDcf(company, scenario) : { value: NaN, label: "-" };
    const reverseFlows = Number.isFinite(reverse.value) ? calculateDcf(company, scenario, reverse.value).flows : [];
    const consensus = numberOrNull(company.consensusGrowth);
    return {
      key: "reverse-dcf",
      title: `Reverse DCF · ${scenarioLabel}`,
      note: getScenarioExplanation(scenario),
      chartTitle: "Market-implied free cash flow / share",
      chartSubtitle: "The five-year FCF path required for the DCF value to equal today’s market price",
      chartUnit: `${currency} / share`,
      modelTitle: "Reverse DCF — Implied Growth",
      modelDescription: category === "operating"
        ? "Works backwards from the current share price to find the annual five-year equity-FCF growth required by the market. Net debt is not subtracted because the cash flow already belongs to shareholders."
        : "Reverse DCF is not used for this company type because ordinary free cash flow is not its primary valuation basis.",
      formula: "Solve equity-FCF growth until present value of equity FCF = current price",
      assumptions: [
        ["Current price", formatTickerMoney(price, currency)],
        ["Starting FCF / share", formatTickerMoney(currentFcf, currency)],
        ["Required equity return", formatPercent(wacc, 1)],
        ["Consensus forecast CAGR", Number.isFinite(consensus) ? `${formatPercent(consensus, 1)} (different method)` : "N/A"]
      ],
      metrics: [
        ["Required 5yr FCF growth", reverse.label, "Annual growth implied by today’s price"],
        ["Current price", formatTickerMoney(price, currency), "The value the model solves back to"],
        ["Starting FCF / share", formatTickerMoney(currentFcf, currency), "Latest FCF input"],
        ["Required equity return", formatPercent(wacc, 1), `${formatPercent(asNumber(company.wacc), 1)} saved input`]
      ],
      chartValues: [{ label: "Actual", value: currentFcf }, ...reverseFlows.map((flow) => ({ label: `Y${flow.year}E`, value: flow.cashFlow }))]
    };
  }

  const isCyclical = category === "cyclical";
  const dcf = category === "operating"
    ? calculateDcf(company, scenario)
    : (isCyclical ? calculateCyclicalDcf(company, scenario) : { value: NaN, flows: [], error: "DCF is not used for this company type." });
  const usesConsensusForecast = growthAssumption.key === "consensus";
  const consensusPerShare = usesConsensusForecast
    ? getMarketConsensusPerShareRows(company, company.consensusGrowthAudit)
    : { valid: false, rows: [] };
  const cyclicalNormalization = isCyclical ? dcf.normalization : null;
  const dcfAssumptions = isCyclical
    ? [
        ["Official history", cyclicalNormalization?.valid ? `${cyclicalNormalization.firstYear}–${cyclicalNormalization.lastYear} · ${cyclicalNormalization.observations} years` : "Unavailable"],
        ["Mid-cycle cash flow / share", cyclicalNormalization?.valid ? formatPerShareMoney(cyclicalNormalization.perShare, currency) : "-"],
        ["Years 1–3", usesConsensusForecast ? "Published market consensus" : (baseDcfGrowth === null ? "Fade toward mid-cycle; CAGR unavailable" : `${formatPercent(growth, 1)} historical FCF CAGR`)],
        ["Years 4–5", "Fade to normalized mid-cycle cash flow"],
        [dcf.cashFlowBasis === "fcff" ? "WACC" : "Required equity return", formatPercent(wacc, 1)],
        ["Net debt treatment", dcf.cashFlowBasis === "fcff" ? "Subtracted once after enterprise value" : "Not subtracted; cash flow is after financing"]
      ]
    : usesConsensusForecast
    ? [
        ...(consensusPerShare.valid
          ? consensusPerShare.rows.map((row) => [`${row.year}E consensus FCF / share`, formatTickerMoney(row.cashFlowPerShare, currency)])
          : [["Published estimates", "Unavailable"]]),
        ["Years 4–5 forecast CAGR", formatPercent(growth, 1)],
        ["Required equity return", formatPercent(wacc, 1)],
        ["Terminal growth", formatPercent(asNumber(company.terminalGrowth), 1)]
      ]
    : [
        ["Starting FCF / share", formatTickerMoney(currentFcf, currency)],
        [growthAssumption.label, formatPercent(growth, 1)],
        ["Required equity return", formatPercent(wacc, 1)],
        ["Terminal growth", formatPercent(asNumber(company.terminalGrowth), 1)]
      ];
  return {
    key: "dcf",
    title: `${isCyclical ? "Mid-cycle DCF" : "DCF"} · ${scenarioLabel}`,
    note: isCyclical
      ? (dcf.error || `${usesConsensusForecast ? "Consensus sets years 1–3" : "The selected historical path sets years 1–3"}; years 4–5 return to a report-derived mid-cycle level.`)
      : getScenarioExplanation(scenario),
    chartTitle: isCyclical ? "Forecast path and return to mid-cycle" : "Projected free cash flow / share",
    chartSubtitle: isCyclical
      ? (usesConsensusForecast
          ? `${scenarioLabel}: three published estimates, then a two-year fade to mid-cycle`
          : `${scenarioLabel}: ${baseDcfGrowth === null ? "mid-cycle fade because CAGR is unavailable" : "historical CAGR for years 1–3, then a two-year fade to mid-cycle"}`)
      : (usesConsensusForecast
          ? `${scenarioLabel}: three published estimates, then forecast CAGR for years 4–5`
          : `${scenarioLabel} five-year forecast using ${growthAssumption.shortLabel}`),
    chartUnit: `${currency} / share`,
    modelTitle: isCyclical ? "Mid-cycle DCF — Cyclical Cash Flow" : "DCF — Discounted Cash Flow",
    modelDescription: isCyclical
      ? (cyclicalNormalization?.valid
          ? `Uses the median of ${cyclicalNormalization.observations} consecutive official-report cash-flow years as the mid-cycle anchor. The selected forecast controls years 1–3, while years 4–5 fade to that anchor before terminal value. ${dcf.cashFlowBasis === "fcff" ? "Verified FCFF is discounted at WACC and net debt is subtracted once." : "The stored history is an after-financing cash-flow measure, so it is discounted at the required equity return and net debt is not subtracted again."}`
          : `No cyclical DCF is shown: ${dcf.error}`)
      : category === "operating"
      ? (usesConsensusForecast
          ? "Uses the three published analyst-consensus FCF estimates for years 1–3. Years 4–5 extend the third estimate with the forecast CAGR. Each total FCF estimate is converted to SEK per share before discounting."
          : `Projects five years of equity free cash flow using the page-level ${growthAssumption.shortLabel} choice, then discounts those cash flows and the terminal value back to today. Net debt is not subtracted again because this cash flow already belongs to shareholders.`)
      : "DCF is not used for this company type in the dashboard’s existing category model.",
    formula: isCyclical
      ? `${dcf.cashFlowBasis === "fcff" ? "PV of 5yr FCFF + PV of terminal FCFF − net debt" : "PV of 5yr after-financing FCF + PV of terminal FCF"} = value per share`
      : "Present value of 5yr equity FCF + present value of terminal equity FCF",
    assumptions: dcfAssumptions,
    metrics: isCyclical
      ? [
          ["Mid-cycle value / share", formatTickerMoney(dcf.value, currency), differenceText(dcf.value)],
          ["Current price", formatTickerMoney(price, currency), "Market price input"],
          ["Mid-cycle cash flow / share", cyclicalNormalization?.valid ? formatPerShareMoney(cyclicalNormalization.perShare, currency) : "-", cyclicalNormalization?.valid ? `Median of ${cyclicalNormalization.firstYear}–${cyclicalNormalization.lastYear}` : "Needs at least five official years"],
          [dcf.cashFlowBasis === "fcff" ? "WACC" : "Required equity return", formatPercent(wacc, 1), `${formatPercent(asNumber(company.wacc), 1)} saved input`]
        ]
      : [
          ["Intrinsic value / share", formatTickerMoney(dcf.value, currency), differenceText(dcf.value)],
          ["Current price", formatTickerMoney(price, currency), "Market price input"],
          [usesConsensusForecast ? "Forecast CAGR" : "5yr DCF growth", formatPercent(growth, 1), baseDcfGrowth === null ? `${growthAssumption.shortLabel} unavailable` : (usesConsensusForecast ? "Applied only to forecast years 4–5" : `${formatPercent(baseDcfGrowth, 1)} ${growthAssumption.shortLabel}`)],
          ["Required equity return", formatPercent(wacc, 1), `${formatPercent(asNumber(company.wacc), 1)} saved input`]
        ],
    chartValues: [{ label: "Current", value: currentFcf }, ...dcf.flows.map((flow) => ({ label: flow.label ?? `Y${flow.year}E`, value: flow.cashFlow }))]
  };
}

function renderSpecializedCyclicalAudit(company, scenario) {
  const boliden = getSpecializedValuation(company, "boliden-commodity-cycle")
    ? calculateBolidenCommodityCycle(company, scenario)
    : null;
  const skanska = getSpecializedValuation(company, "skanska-sotp")
    ? calculateSkanskaSotp(company, scenario)
    : null;
  const model = boliden ?? skanska;
  if (!model || !elements.specializedCyclicalAudit) return false;

  const config = model.config;
  const sourcePages = (config.sourcePages ?? []).map((page) => `p. ${page}`).join(", ");
  const sourceLink = `<a href="${escapeHtml(config.sourceUrl)}" target="_blank" rel="noreferrer">Open official report · ${escapeHtml(sourcePages)}</a>`;
  elements.cyclicalAuditStatus.textContent = boliden
    ? "Official planning prices + published sensitivities → normalized EBITDA → weighted valuation"
    : "Official segment earnings + development assets + surplus values + net cash → equity value";

  if (boliden) {
    const driverRows = boliden.drivers.map((driver) => `
      <tr>
        <td><strong>${escapeHtml(driver.label)}</strong><br><small>${escapeHtml(driver.unit ?? "rate")}</small></td>
        <td>${escapeHtml(formatDecimal(driver.nearTerm, driver.nearTerm < 100 ? 2 : 0))}</td>
        <td>${escapeHtml(formatDecimal(driver.longTerm, driver.longTerm < 100 ? 2 : 0))}</td>
        <td>${escapeHtml(formatPercent(driver.relativeChange * 100, 1))}</td>
        <td>${escapeHtml(`${formatDecimal(driver.operatingProfitAdjustment, 0)} SEK m`)}</td>
      </tr>
    `).join("");
    const blendRows = boliden.valuationBlend.components.map((component) => `
      <div><dt>${escapeHtml(component.label)} · ${escapeHtml(formatBlendWeight(component.effectiveWeight))}</dt><dd>${escapeHtml(formatTickerMoney(component.contribution, "SEK"))}</dd></div>
    `).join("");
    const flowRows = boliden.dcf?.flows?.length
      ? boliden.dcf.flows.map((flow) => `
          <tr><td>${escapeHtml(flow.label ?? `Y${flow.year}E`)}</td><td>${escapeHtml(formatPerShareMoney(flow.cashFlow, "SEK"))}</td><td>${escapeHtml(formatPerShareMoney(flow.discounted, "SEK"))}</td><td><span class="audit-evidence">${escapeHtml(flow.source)}</span></td></tr>
        `).join("")
      : `<tr><td colspan="4" class="empty-row">${escapeHtml(boliden.dcf?.error ?? "Forward FCF DCF unavailable")}</td></tr>`;
    elements.specializedCyclicalAudit.innerHTML = `
      <div class="cyclical-step-grid">
        ${[
          ["1", "Set a normal cycle", "Use Boliden’s 2029 long-term metal prices and exchange rates instead of assuming today’s cycle lasts forever."],
          ["2", "Bridge EBITDA", "Scale each published 10% operating-profit sensitivity by the actual move from the near-term planning value to the long-term value."],
          ["3", "Value operations", "Apply the explicit scenario EV/EBITDA multiple to normalized EBITDA, then subtract net debt once."],
          ["4", "Cross-check and weight", "Blend 70% commodity EV/EBITDA with 30% mid-cycle FCF DCF. Years 4–5 return to the full-cycle median instead of extending a commodity spike; analyst target prices have 0% weight."]
        ].map(([number, title, copy]) => `<div class="cyclical-step"><span>${number}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(copy)}</small></div></div>`).join("")}
      </div>
      <div class="specialized-source"><div><span class="audit-badge is-official">Official report inputs</span><strong>${escapeHtml(config.sourceName)}</strong><small>${escapeHtml(config.sourceExplanation)}</small></div>${sourceLink}</div>
      <div class="cyclical-audit-grid">
        <div class="cyclical-audit-card">
          <div class="cyclical-card-heading"><div><span class="eyebrow">Official sensitivity bridge</span><h5>Near-term planning values → long-term cycle</h5></div></div>
          <div class="table-scroll"><table class="cyclical-table"><thead><tr><th>Driver</th><th>Near term</th><th>Long term</th><th>Change</th><th>EBIT effect</th></tr></thead><tbody>${driverRows}</tbody></table></div>
          <p class="cyclical-formula">Effect for each driver = published operating-profit sensitivity at +10% × ((long-term value ÷ near-term value − 1) ÷ 10%).<br><strong>Total commodity and FX adjustment: ${escapeHtml(`${formatDecimal(boliden.operatingProfitAdjustmentSekm, 0)} SEK million`)}</strong></p>
        </div>
        <div class="cyclical-audit-card">
          <div class="cyclical-card-heading"><div><span class="eyebrow">Valuation bridge</span><h5>Normalized operations → equity value per share</h5></div></div>
          <dl class="cyclical-bridge">
            <div><dt>Reported TTM EBITDA <span class="audit-badge is-official">official</span></dt><dd>${escapeHtml(formatCurrency(boliden.currentEbitda, "SEK"))}</dd></div>
            <div><dt>Commodity and FX adjustment <span class="audit-badge is-calculated">calculated</span></dt><dd>${escapeHtml(`${formatDecimal(boliden.operatingProfitAdjustmentSekm, 0)} SEK m`)}</dd></div>
            <div><dt>Normalized EBITDA <span class="audit-badge is-calculated">calculated</span></dt><dd>${escapeHtml(formatCurrency(boliden.normalizedEbitda, "SEK"))}</dd></div>
            <div><dt>Scenario EV/EBITDA <span class="audit-badge is-assumption">assumption</span></dt><dd>${escapeHtml(`${formatDecimal(boliden.multiple, 1)}x`)}</dd></div>
            <div><dt>Less net debt <span class="audit-badge is-official">official</span></dt><dd>${escapeHtml(formatCurrency(boliden.netDebt, "SEK"))}</dd></div>
            <div class="is-total"><dt>Commodity EV/EBITDA value</dt><dd>${escapeHtml(formatTickerMoney(boliden.evEbitdaValue, "SEK"))}</dd></div>
          </dl>
          <p class="cyclical-formula"><strong>The ${escapeHtml(`${formatDecimal(boliden.multiple, 1)}x`)} multiple is a visible dashboard assumption.</strong> It is not taken from an analyst target price and is not calibrated to today’s share price.</p>
        </div>
      </div>
      <div class="cyclical-audit-card">
          <div class="cyclical-card-heading"><div><span class="eyebrow">Independent cash-flow component</span><h5>Selected forecast → mid-cycle FCF DCF</h5></div></div>
        <div class="table-scroll"><table class="cyclical-table"><thead><tr><th>Forecast year</th><th>FCF/share</th><th>Present value</th><th>Basis</th></tr></thead><tbody>${flowRows}</tbody></table></div>
        <dl class="cyclical-bridge">${blendRows}<div class="is-total"><dt>Weighted intrinsic value</dt><dd>${escapeHtml(formatTickerMoney(boliden.value, "SEK"))}</dd></div></dl>
      </div>
      <div class="specialized-caveats"><strong>What is deliberately not assumed</strong><ul>${(config.omissions ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}<li>Analyst target prices: 0% weight in every component.</li></ul></div>
    `;
  } else {
    const componentRows = skanska.components.map((component) => `
      <div><dt>${escapeHtml(component.label)}</dt><dd>${escapeHtml(`${formatDecimal(component.valueSekm, 0)} SEK m · ${formatPerShareMoney(component.perShare, "SEK")}`)}</dd></div>
    `).join("");
    const c = config;
    elements.specializedCyclicalAudit.innerHTML = `
      <div class="cyclical-step-grid">
        ${[
          ["1", "Normalize Construction", "Average 2024 and 2025 Construction operating income, then deduct the average recurring central cost."],
          ["2", "Value the franchise", "Apply the explicit scenario EBIT multiple to normalized Construction earnings after central cost."],
          ["3", "Value development assets", "Add reported capital employed and after-tax disclosed surplus values for each development and property business."],
          ["4", "Reach equity value", "Add adjusted net cash once, sum every component and divide by reported shares. Analyst target prices have 0% weight."]
        ].map(([number, title, copy]) => `<div class="cyclical-step"><span>${number}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(copy)}</small></div></div>`).join("")}
      </div>
      <div class="specialized-source"><div><span class="audit-badge is-official">Official report inputs</span><strong>${escapeHtml(config.sourceName)}</strong><small>${escapeHtml(config.sourceExplanation)}</small></div>${sourceLink}</div>
      <div class="cyclical-audit-grid">
        <div class="cyclical-audit-card">
          <div class="cyclical-card-heading"><div><span class="eyebrow">Construction franchise</span><h5>Normalize earnings before applying a multiple</h5></div></div>
          <dl class="cyclical-bridge">
            <div><dt>Construction operating income 2025 <span class="audit-badge is-official">official</span></dt><dd>${escapeHtml(`${formatDecimal(c.construction.operatingIncome2025, 0)} SEK m`)}</dd></div>
            <div><dt>Construction operating income 2024 <span class="audit-badge is-official">official</span></dt><dd>${escapeHtml(`${formatDecimal(c.construction.operatingIncome2024, 0)} SEK m`)}</dd></div>
            <div><dt>Two-year average</dt><dd>${escapeHtml(`${formatDecimal(skanska.normalizedConstructionEbit, 0)} SEK m`)}</dd></div>
            <div><dt>Less normalized central cost</dt><dd>${escapeHtml(`${formatDecimal(skanska.normalizedCentralCost, 0)} SEK m`)}</dd></div>
            <div><dt>Scenario EBIT multiple <span class="audit-badge is-assumption">assumption</span></dt><dd>${escapeHtml(`${formatDecimal(skanska.constructionMultiple, 1)}x`)}</dd></div>
            <div class="is-total"><dt>Construction franchise value</dt><dd>${escapeHtml(`${formatDecimal(skanska.constructionValueSekm, 0)} SEK m`)}</dd></div>
          </dl>
          <p class="cyclical-formula">Construction value = ((7,094 + 5,854) ÷ 2 − (712 + 440) ÷ 2) × ${escapeHtml(formatDecimal(skanska.constructionMultiple, 1))} = <strong>${escapeHtml(`${formatDecimal(skanska.constructionValueSekm, 0)} SEK million`)}</strong>.</p>
        </div>
        <div class="cyclical-audit-card">
          <div class="cyclical-card-heading"><div><span class="eyebrow">Development and property assets</span><h5>Reported capital + after-tax disclosed surplus</h5></div></div>
          <dl class="cyclical-bridge">
            <div><dt>Residential capital + after-tax surplus</dt><dd>${escapeHtml(`${formatDecimal(skanska.components[1].valueSekm, 0)} SEK m`)}</dd></div>
            <div><dt>Commercial capital + after-tax surplus</dt><dd>${escapeHtml(`${formatDecimal(skanska.components[2].valueSekm, 0)} SEK m`)}</dd></div>
            <div><dt>Investment properties</dt><dd>${escapeHtml(`${formatDecimal(skanska.components[3].valueSekm, 0)} SEK m`)}</dd></div>
            <div><dt>PPP after-tax surplus</dt><dd>${escapeHtml(`${formatDecimal(skanska.components[4].valueSekm, 0)} SEK m`)}</dd></div>
            <div><dt>Scenario factor <span class="audit-badge is-assumption">assumption</span></dt><dd>${escapeHtml(formatPercent((skanska.developmentFactor - 1) * 100, 0))}</dd></div>
          </dl>
          <p class="cyclical-formula">Disclosed surplus is reduced by Skanska’s ${escapeHtml(formatPercent(skanska.taxRate * 100, 0))} standard tax rate before it is added. The scenario factor applies only to the development and property block.</p>
        </div>
      </div>
      <div class="cyclical-audit-card">
        <div class="cyclical-card-heading"><div><span class="eyebrow">Sum of the parts</span><h5>Every component’s contribution</h5></div></div>
        <dl class="cyclical-bridge">${componentRows}<div class="is-total"><dt>Total equity value ÷ ${escapeHtml(formatShares(skanska.shares))} shares</dt><dd>${escapeHtml(formatTickerMoney(skanska.value, "SEK"))}</dd></div></dl>
      </div>
      <div class="specialized-caveats"><strong>What is deliberately not assumed</strong><ul>${(config.omissions ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}<li>Analyst target prices: 0% weight in every SOTP component.</li></ul></div>
    `;
  }
  elements.specializedCyclicalAudit.hidden = false;
  return true;
}

function renderCyclicalAudit(company) {
  if (!elements.cyclicalAudit) return;
  const category = normalizeCompanyType(company.companyType, company.ticker);
  const shouldShow = category === "cyclical" && state.analysisModel === "dcf";
  elements.cyclicalAudit.hidden = !shouldShow;
  if (!shouldShow) return;

  const specialized = renderSpecializedCyclicalAudit(company, state.scenario);
  if (elements.genericCyclicalAudit) elements.genericCyclicalAudit.hidden = specialized;
  if (specialized) return;
  if (elements.specializedCyclicalAudit) {
    elements.specializedCyclicalAudit.hidden = true;
    elements.specializedCyclicalAudit.innerHTML = "";
  }

  const currency = company.currency ?? "SEK";
  const scenario = state.scenario;
  const dcf = calculateCyclicalDcf(company, scenario);
  const normalization = dcf.normalization ?? getCyclicalHistoryNormalization(company);
  const ebitdaValue = calculateEbitdaValue(company, scenario, true);
  const peValue = calculateCyclicalPeCrossCheck(company, scenario);
  const subtype = getCyclicalSubtype(company);
  const basisLabel = normalization.basis === "fcff"
    ? "FCFF before financing"
    : (normalization.basis === "equity-fcf" ? "CFO − capex, after financing" : "Company-defined after-capex cash flow");

  elements.cyclicalAuditStatus.textContent = normalization.valid
    ? `${normalization.firstYear}–${normalization.lastYear} · ${normalization.observations} official years · ${basisLabel}`
    : dcf.error;
  elements.cyclicalSteps.innerHTML = [
    ["1", "Normalize", normalization.valid ? `Take the median of ${normalization.observations} consecutive official-report years.` : "Wait until at least five consecutive official years are available."],
    ["2", "Forecast", `${state.growthAssumption === "consensus" ? "Market consensus" : "Historical CAGR"} sets years 1–3; missing CAGR triggers a clearly labelled fade.`],
    ["3", "Return to mid-cycle", "Year 4 moves halfway to the normalized level; year 5 reaches it."],
    ["4", "Discount", normalization.basis === "fcff" ? "Discount FCFF at WACC, then subtract net debt once." : "Discount after-financing cash flow at the required equity return; do not subtract net debt again."]
  ].map(([number, title, copy]) => `
    <div class="cyclical-step">
      <span>${number}</span>
      <div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(copy)}</small></div>
    </div>
  `).join("");

  const sourceUrl = normalization.valid ? normalization.sourceUrls[0] : null;
  elements.cyclicalSourceLink.hidden = !sourceUrl;
  if (sourceUrl) {
    elements.cyclicalSourceLink.href = sourceUrl;
    elements.cyclicalSourceLink.textContent = normalization.sourceNames[0] ? `Open ${normalization.sourceNames[0]}` : "Open official report";
  }

  elements.cyclicalHistoryRows.innerHTML = normalization.rows?.length
    ? normalization.rows.map((row) => `
        <tr>
          <td>${row.year}</td>
          <td>${escapeHtml(formatCurrency(row.cashFlow, currency))}</td>
          <td>${escapeHtml(formatPerShareMoney(row.cashFlow / (normalization.shares || 1), currency))}</td>
          <td><span class="audit-evidence">${escapeHtml(row.methodLabel ?? row.method ?? "Reported cash-flow measure")}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="empty-row">${escapeHtml(dcf.error || "No verified history available")}</td></tr>`;
  elements.cyclicalNormalizationFormula.innerHTML = normalization.valid
    ? `Mid-cycle cash flow / share = median of ${normalization.observations} annual cash flows ÷ ${escapeHtml(formatShares(normalization.shares))} shares = <strong>${escapeHtml(formatPerShareMoney(normalization.perShare, currency))}</strong>. Every year remains in the calculation; peak and trough years are not manually removed.`
    : `<strong>Not calculated.</strong> ${escapeHtml(dcf.error || normalization.reason)}`;

  elements.cyclicalForecastRows.innerHTML = dcf.flows.length
    ? dcf.flows.map((flow) => `
        <tr>
          <td>${escapeHtml(flow.label)}</td>
          <td>${escapeHtml(formatPerShareMoney(flow.cashFlow, currency))}</td>
          <td>${escapeHtml(formatPerShareMoney(flow.discounted, currency))}</td>
          <td><span class="audit-evidence">${escapeHtml(flow.source)}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="empty-row">${escapeHtml(dcf.error || "Forecast unavailable")}</td></tr>`;

  const bridgeRows = [
    ["Present value of years 1–5", formatTickerMoney(dcf.presentValue, currency)],
    ["Present value of terminal cash flow", formatTickerMoney(dcf.discountedTerminal, currency)],
    ["Net debt adjustment", Number.isFinite(dcf.netDebtAdjustment) ? formatTickerMoney(dcf.netDebtAdjustment, currency) : "-"],
    ["Value per share", formatTickerMoney(dcf.value, currency)]
  ];
  elements.cyclicalValueBridge.innerHTML = bridgeRows.map(([label, value], index) => `
    <div class="${index === bridgeRows.length - 1 ? "is-total" : ""}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
  `).join("");

  elements.cyclicalPrimaryValue.textContent = formatTickerMoney(dcf.value, currency);
  elements.cyclicalEbitdaCheck.textContent = formatTickerMoney(ebitdaValue, currency);
  elements.cyclicalEbitdaNote.textContent = Number.isFinite(ebitdaValue)
    ? `${formatPerShareMoney(numberOrNull(company.normalizedEbitdaPerShare), currency)} normalized EBITDA/share × ${formatDecimal(asNumber(company.targetEvToEbitda) + (scenarioAdjustments[scenario]?.targetPe ?? 0) * 0.35, 1)}x, then net debt`
    : "Unavailable: normalized EBITDA is not explicitly supported; current EBITDA is not substituted.";
  elements.cyclicalPeCheck.textContent = formatTickerMoney(peValue, currency);
  elements.cyclicalPeNote.textContent = Number.isFinite(peValue)
    ? "Three published analyst EPS estimates plus a two-year EPS-CAGR extension; valued at the terminal P/E and discounted to today. This is a 0%-weight cross-check."
    : "Unavailable: three positive, traceable analyst EPS estimates are required; FCF growth is never substituted.";
  elements.cyclicalSubtype.textContent = subtype.label;
  elements.cyclicalSubtypeNote.textContent = subtype.note;
}

function renderAnalysis(company) {
  const presentation = getAnalysisPresentation(company);
  const category = normalizeCompanyType(company.companyType, company.ticker);
  const isCyclical = category === "cyclical";
  const isInvestment = category === "investment";
  elements.analysisPanelTitle.textContent = isInvestment ? "NAV Analysis" : "Financial Analysis";
  elements.analysisPanel.setAttribute("aria-label", isInvestment ? "NAV analysis" : "Financial analysis");
  elements.analysisControls.hidden = isInvestment;
  elements.scenarioGuide.hidden = isInvestment;
  elements.analysisPanel.classList.toggle("is-investment-nav", isInvestment);
  const metricTargets = [
    [elements.valuationPrimaryLabel, elements.dcfValue, elements.valuationPrimarySub],
    [elements.valuationSecondaryLabel, elements.peValue, elements.valuationSecondarySub],
    [elements.valuationTertiaryLabel, elements.currentPe, elements.valuationTertiarySub],
    [elements.valuationFourthLabel, elements.valuationFourthValue, elements.valuationFourthSub]
  ];
  presentation.metrics.forEach(([label, value, sub], index) => {
    metricTargets[index][0].textContent = label;
    metricTargets[index][1].textContent = value;
    metricTargets[index][2].textContent = sub;
  });

  elements.analysisMetricsTitle.textContent = presentation.title;
  elements.analysisMetricsNote.textContent = presentation.note;
  elements.analysisChartTitle.textContent = presentation.chartTitle;
  elements.analysisChartSubtitle.textContent = presentation.chartSubtitle;
  elements.analysisChartUnit.textContent = presentation.chartUnit;
  elements.analysisModelTitle.textContent = presentation.modelTitle;
  elements.analysisModelDescription.innerHTML = `${escapeHtml(presentation.modelDescription)}${presentation.sourceUrl
    ? ` <a href="${escapeHtml(presentation.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(presentation.sourceLabel ?? "Open source")}</a>`
    : ""}`;
  elements.analysisFormula.textContent = presentation.formula;
  elements.analysisAssumptions.innerHTML = presentation.assumptions
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
  if (isInvestment) {
    elements.scenarioBaseCopy.textContent = "Investment companies use the latest reported NAV or equity per share without a scenario adjustment.";
    elements.scenarioBullCopy.textContent = "Not used for NAV analysis.";
    elements.scenarioBearCopy.textContent = "Not used for NAV analysis.";
  } else if (state.analysisModel === "pe") {
    elements.scenarioBaseCopy.textContent = "Uses the three published analyst EPS estimates, extends years 4–5 at their EPS CAGR, applies the current P/E in year 5 and discounts the result.";
    elements.scenarioBullCopy.textContent = "Published EPS years 1–3 stay unchanged; years 4–5 EPS CAGR +2.0 pp, year-5 P/E +2.0x and required return −0.7 pp.";
    elements.scenarioBearCopy.textContent = "Published EPS years 1–3 stay unchanged; years 4–5 EPS CAGR −2.0 pp, year-5 P/E −2.0x and required return +1.0 pp.";
  } else if (getSpecializedValuation(company, "boliden-commodity-cycle")) {
    elements.scenarioBaseCopy.textContent = "Uses Boliden’s long-term prices, a 7.5x normalized EV/EBITDA assumption and the selected years 1–3 forecast; years 4–5 fade to full-cycle cash flow.";
    elements.scenarioBullCopy.textContent = "Uses an 8.0x normalized EV/EBITDA assumption, FCF growth +2.0 pp and required return −0.7 pp.";
    elements.scenarioBearCopy.textContent = "Uses a 7.0x normalized EV/EBITDA assumption, FCF growth −2.0 pp and required return +1.0 pp.";
  } else if (getSpecializedValuation(company, "skanska-sotp")) {
    elements.scenarioBaseCopy.textContent = "Uses an 8.0x Construction EBIT multiple and 100% of the calculated development and property NAV.";
    elements.scenarioBullCopy.textContent = "Uses a 9.0x Construction EBIT multiple and 105% of the calculated development and property NAV.";
    elements.scenarioBearCopy.textContent = "Uses a 7.0x Construction EBIT multiple and 90% of the calculated development and property NAV.";
  } else if (isCyclical) {
    elements.scenarioBaseCopy.textContent = "Uses the selected years 1–3 forecast and fades years 4–5 to the report-derived mid-cycle cash flow.";
    elements.scenarioBullCopy.textContent = "Uses a stronger mid-cycle path (+2.0 pp) and a required return 0.7 pp lower; consensus years 1–3 stay unchanged.";
    elements.scenarioBearCopy.textContent = "Uses a weaker mid-cycle path (−2.0 pp) and a required return 1.0 pp higher; consensus years 1–3 stay unchanged.";
  } else {
    elements.scenarioBaseCopy.textContent = "Uses the selected Growth forecast, required return and EV/EBITDA assumption without adjustment.";
    elements.scenarioBullCopy.textContent = "Growth +2.0 pp; for Market consensus this adjusts only the years 4–5 CAGR extension. Required return −0.7 pp and EV/EBITDA +0.7x.";
    elements.scenarioBearCopy.textContent = "Growth −2.0 pp; for Market consensus this adjusts only the years 4–5 CAGR extension. Required return +1.0 pp and EV/EBITDA −0.7x.";
  }
  renderCyclicalAudit(company);
}

function renderMetrics() {
  const company = getSelectedCompany();
  if (!company) return;

  const calc = calculateCompany(company);
  elements.metricValue.textContent = formatCurrency(calc.blendedValue, company.currency ?? "SEK");
  renderValuationBreakdown(calc.model, company.currency ?? "SEK");
  elements.heroCurrentPrice.textContent = formatTickerMoney(asNumber(company.marketPrice), company.currency ?? "SEK");
  elements.metricMos.textContent = formatPercent(calc.marginOfSafety, 1);
  elements.metricMos.className = calc.marginOfSafety >= 0 ? "is-positive" : "is-negative";
  elements.metricMosSub.textContent = calc.marginOfSafety >= 0 ? "upside" : "downside";
  elements.metricReverseLabel.textContent = calc.model.reverseLabel;
  elements.metricReverse.textContent = calc.model.reverseValue;
  elements.metricReverseSub.textContent = calc.model.reverseSub;
  elements.metricScore.textContent = Number.isFinite(calc.researchScore) ? `${calc.researchScore}` : "-";
  elements.metricScoreSub.textContent = calc.stance.label;

  renderAnalysis(company);
}

function renderRiktkurser() {
  const company = getSelectedCompany();
  if (!company || !elements.riktkursSummary) return;

  const data = company.targetPriceData ?? {};
  const targetPrice = numberOrNull(data.targetPrice);
  const upsidePercent = numberOrNull(data.upsidePercent);
  const targetCount = numberOrNull(data.targetCount);
  const latest = Array.isArray(data.latest) ? data.latest : [];
  const hasSource = Boolean(data.sourceUrl);

  elements.riktkursSummary.textContent = data.dataUpdatedAt
    ? `Börskollen | ${formatDateTime(data.dataUpdatedAt) ?? formatDate(data.dataUpdatedAt)}`
    : "Börskollen target prices";
  elements.riktkursTarget.textContent = formatCurrency(targetPrice, company.currency ?? "SEK");
  elements.riktkursUpside.textContent = formatPercent(upsidePercent, 1);
  elements.riktkursUpside.className = upsidePercent === null ? "" : (upsidePercent >= 0 ? "is-positive" : "is-negative");
  elements.riktkursConsensus.textContent = translateTargetRating(data.consensus);
  elements.riktkursCount.textContent = targetCount === null ? "-" : `${targetCount} targets`;
  elements.riktkursLatest.innerHTML = latest.length
    ? latest.map((item) => renderRiktkursRow(item, company)).join("")
    : `<div class="empty-row">No target prices loaded yet</div>`;

  elements.riktkursSource.hidden = !hasSource;
  if (hasSource) {
    elements.riktkursSource.href = data.sourceUrl;
  }
}

function renderRiktkursRow(item, company) {
  const target = numberOrNull(item.targetPrice);
  const upside = numberOrNull(item.upsidePercent);
  const analyst = item.analyst || "Unknown analyst";
  const action = translateTargetAction(item.action);
  const rating = translateTargetRating(item.rating);
  return `
    <div class="riktkurs-row">
      <span>${escapeHtml(translateTargetDate(item.date))}</span>
      <strong>${escapeHtml(analyst)}</strong>
      <span>${escapeHtml(action)}</span>
      <span>${escapeHtml(rating)}</span>
      <span>${formatCurrency(target, company.currency ?? "SEK")}</span>
      <span class="${upside === null ? "" : (upside >= 0 ? "is-positive" : "is-negative")}">${formatPercent(upside, 1)}</span>
    </div>
  `;
}

function renderSyntheticPortfolio() {
  const rankedByCategory = getRankedCompaniesByCategory();
  const allRanked = Object.values(rankedByCategory)
    .flat()
    .filter((item) => Number.isFinite(item.calc.blendedValue) && Number.isFinite(item.calc.marginOfSafety))
    .sort(compareRankedCompanies);
  const topPortfolio = allRanked.slice(0, 12);

  elements.syntheticCount.textContent = `${topPortfolio.length} names`;
  const averageMos = topPortfolio.length
    ? topPortfolio.reduce((sum, item) => sum + item.calc.marginOfSafety, 0) / topPortfolio.length
    : NaN;
  elements.syntheticSummary.textContent = topPortfolio.length
    ? `Category-fit models | Equal weight ${formatDecimal(100 / topPortfolio.length, 1)}% | Avg safety ${formatPercent(averageMos, 1)}`
    : "Add model inputs to rank the portfolio";

  elements.syntheticPortfolio.innerHTML = `
    ${renderPortfolioSection("Best 12 Across Fit Models", "Equal-weight synthetic portfolio candidates", topPortfolio)}
    ${renderPortfolioSection("Operating Companies", getCompanyModelLabel("operating"), rankedByCategory.operating)}
    ${renderPortfolioSection("Banks", getCompanyModelLabel("bank"), rankedByCategory.bank)}
    ${renderPortfolioSection("Investment Companies", getCompanyModelLabel("investment"), rankedByCategory.investment)}
    ${renderPortfolioSection("Asset-heavy Cyclicals", getCompanyModelLabel("cyclical"), rankedByCategory.cyclical)}
  `;
}

function getRankedCompaniesByCategory() {
  const categories = {
    operating: [],
    bank: [],
    investment: [],
    cyclical: []
  };

  state.companies
    .map((company) => ({ company, calc: calculateCompany(company, "base") }))
    .forEach((item) => {
      const category = normalizeCompanyType(item.company.companyType, item.company.ticker);
      const hasValuation = Number.isFinite(item.calc.blendedValue) && Number.isFinite(item.calc.marginOfSafety);
      if (category === "operating" && !hasValuation) return;
      categories[category].push(item);
    });

  Object.values(categories).forEach((items) => items.sort(compareRankedCompanies));

  return categories;
}

function compareRankedCompanies(left, right) {
  const rightValued = Number.isFinite(right.calc.blendedValue) ? 1 : 0;
  const leftValued = Number.isFinite(left.calc.blendedValue) ? 1 : 0;
  if (rightValued !== leftValued) return rightValued - leftValued;
  if (right.calc.portfolioScore !== left.calc.portfolioScore) return right.calc.portfolioScore - left.calc.portfolioScore;
  return numberOrFallback(right.calc.marginOfSafety, -999) - numberOrFallback(left.calc.marginOfSafety, -999);
}

function renderPortfolioSection(title, subtitle, items) {
  return `
    <div class="portfolio-block">
      <div class="portfolio-block-title">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="synthetic-header">
        <span>Rank</span>
        <span>Company</span>
        <span>Price</span>
        <span>Intrinsic</span>
        <span>Safety</span>
        <span>Score</span>
      </div>
      ${items.map(({ company, calc }, index) => {
        const category = normalizeCompanyType(company.companyType, company.ticker);
        const valued = Number.isFinite(calc.blendedValue) && Number.isFinite(calc.marginOfSafety);
        return `
          <button class="synthetic-row ${company.id === state.selectedId ? "is-active" : ""}" type="button" data-company-id="${company.id}">
            <span>${index + 1}</span>
            <span>
              <strong>${escapeHtml(company.name)}</strong>
              <small>${escapeHtml(company.ticker)} | ${escapeHtml(getCompanyTypeShortLabel(category))}</small>
            </span>
            <span>${formatCurrency(asNumber(company.marketPrice), company.currency ?? "SEK")}</span>
            <span>${valued ? formatCurrency(calc.blendedValue, company.currency ?? "SEK") : escapeHtml(calc.model.valueDescription)}</span>
            <span class="${valued ? (calc.marginOfSafety >= 0 ? "is-positive" : "is-negative") : "is-amber"}">${valued ? formatPercent(calc.marginOfSafety, 1) : "Needs input"}</span>
            <span>${valued ? calc.portfolioScore : calc.researchScore}</span>
          </button>
        `;
      }).join("") || `<div class="empty-row">No companies in this bucket</div>`}
    </div>
  `;
}

function formatReportedMetricAmount(value, audit) {
  if (!Number.isFinite(numberOrNull(value))) return "-";
  const digits = Math.abs(value) < 10 && !Number.isInteger(value) ? 3 : 0;
  const number = Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
  return `${number} ${audit?.unit ?? audit?.reportedCurrency ?? ""}`.trim();
}

function renderMetricAudit(audit, summaryElement, bodyElement, currency) {
  if (!summaryElement || !bodyElement) return;
  if (!audit) {
    summaryElement.textContent = "Not documented";
    bodyElement.innerHTML = `<p>No calculation audit is stored for this metric.</p>`;
    return;
  }

  const statusLabels = {
    reported: "Reported",
    derived: "Derived from report",
    standardized: "Standardized",
    "company-defined": "Company-defined fallback",
    unavailable: "Unavailable",
    "not-applicable": "Not applicable"
  };
  const statusLabel = statusLabels[audit.status] ?? audit.status ?? "Unknown";
  const result = numberOrNull(audit.result);
  summaryElement.textContent = result === null ? statusLabel : formatCurrency(result, currency);

  const components = Array.isArray(audit.components) ? audit.components : [];
  const componentRows = components.map((component) => {
    const sign = Number(component.sign ?? 1) < 0 ? "−" : "+";
    return `<tr><td>${sign} ${escapeHtml(component.label ?? "Component")}</td><td>${escapeHtml(formatReportedMetricAmount(Math.abs(component.reportedValue ?? 0), audit))}</td></tr>`;
  }).join("");
  const sourceRows = [...new Map([
    [audit.sourceUrl, audit.sourceName],
    ...components.map((component) => [component.sourceUrl, component.sourceName])
  ].filter(([url]) => url).map(([url, name]) => [url, name ?? "Official company report"])).entries()]
    .map(([url, name]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`)
    .join(" · ");
  const reportedResult = numberOrNull(audit.reportedResult);
  const formulaResult = reportedResult === null ? null : formatReportedMetricAmount(reportedResult, audit);
  const fx = numberOrNull(audit.financialToQuoteFx);
  const conversion = result !== null && fx !== null && audit.reportedCurrency !== audit.quoteCurrency
    ? `<p><strong>Currency conversion:</strong> ${escapeHtml(formulaResult)} × ${formatDecimal(fx, 4)} ${escapeHtml(audit.quoteCurrency)}/${escapeHtml(audit.reportedCurrency)} = <strong>${escapeHtml(formatCurrency(result, currency))}</strong>.</p>`
    : "";

  bodyElement.innerHTML = `
    <div class="metric-audit-head">
      <span class="metric-audit-status">${escapeHtml(statusLabel)}</span>
      <span>${escapeHtml(audit.label ?? "Metric")} · ${escapeHtml(audit.period ?? "Period unavailable")}</span>
    </div>
    ${audit.formula ? `<p class="metric-audit-formula"><strong>Formula:</strong> ${escapeHtml(audit.formula)}${formulaResult ? ` = <strong>${escapeHtml(formulaResult)}</strong>` : ""}</p>` : ""}
    ${componentRows ? `<table class="metric-audit-components"><tbody>${componentRows}</tbody></table>` : ""}
    ${conversion}
    ${audit.note ? `<p>${escapeHtml(audit.note)}</p>` : ""}
    <p class="metric-audit-source">${sourceRows ? `Source: ${sourceRows}` : "Source unavailable"} · Verified ${escapeHtml(formatDate(audit.verifiedAt) ?? "date unavailable")}</p>
  `;
}

function renderFundamentals() {
  const company = getSelectedCompany();
  if (!company) return;

  const currency = company.currency ?? "SEK";
  const fundamentals = company.fundamentals ?? {};
  const fcfYield = numberOrNull(fundamentals.fcfYield);
  const updatedDate = formatDate(company.dataUpdatedAt);
  const updatedText = updatedDate ? `Updated: ${updatedDate}` : "No fundamentals loaded";
  const statementReferences = [
    formatStatementReference("Income statement", fundamentals.incomeStatementPeriod, fundamentals.incomeStatementDate),
    formatStatementReference("Balance sheet", fundamentals.balanceSheetPeriod, fundamentals.balanceSheetDate),
    formatStatementReference("Cash flow statement", fundamentals.cashFlowStatementPeriod, fundamentals.cashFlowStatementDate)
  ].filter(Boolean);
  const quality = company.dataQuality ?? fundamentals.dataQuality;
  const qualityText = quality?.status && quality.status !== "ok"
    ? `Data quality: ${quality.status} - ${(quality.issues ?? []).join("; ")}`
    : null;
  const verification = company.independentVerification ?? fundamentals.independentVerification;
  const verificationText = verification?.status === "verified"
    ? `Independently verified: ${verification.sourceName} (${verification.period})`
    : "Independent verification: missing";
  const balancePeriodLabel = verification?.status === "verified" ? "latest quarter" : "cached period";
  elements.fundRevenueLabel.textContent = verification?.status === "verified" ? "Revenue (TTM)" : "Revenue (cached TTM)";
  elements.fundEbitdaLabel.textContent = verification?.status === "verified" ? "EBITDA (TTM)" : "EBITDA (cached TTM)";
  const metricCalculations = fundamentals.metricCalculations ?? {};
  const fcfAudit = metricCalculations.freeCashFlow;
  const ebitdaAudit = metricCalculations.ebitda;
  elements.fundFcfLabel.textContent = verification?.status === "verified"
    ? (fcfAudit?.label ?? "Equity free cash flow (TTM)")
    : "Free cash flow (cached TTM)";
  elements.fundAssetsLabel.textContent = `Total assets (${balancePeriodLabel})`;
  elements.fundEquityLabel.textContent = `Book equity (${balancePeriodLabel})`;
  elements.fundLiabilitiesLabel.textContent = `Liabilities (${balancePeriodLabel})`;
  elements.fundDebtLabel.textContent = `Total debt (${balancePeriodLabel})`;
  elements.fundCashLabel.textContent = `Cash (${balancePeriodLabel})`;

  elements.fundamentalsSubtitle.textContent = [
    company.source,
    updatedText,
    verificationText,
    qualityText,
    ...statementReferences
  ].filter(Boolean).join(" | ");
  const officialSource = verification?.sourceUrl ? verification : company.officialSource;
  if (officialSource?.sourceUrl) {
    elements.fundamentalsSourceLink.hidden = false;
    elements.fundamentalsSourceLink.href = officialSource.sourceUrl;
    elements.fundamentalsSourceLink.textContent = verification?.status === "verified"
      ? `Verified source: ${officialSource.sourceName ?? "Official company report"}`
      : `Official report for verification: ${officialSource.sourceName ?? "Official company report"}`;
  } else {
    elements.fundamentalsSourceLink.hidden = true;
    elements.fundamentalsSourceLink.removeAttribute("href");
    elements.fundamentalsSourceLink.textContent = "Source unavailable";
  }
  elements.fundMarketCap.textContent = formatCurrency(numberOrNull(fundamentals.marketCap), currency);
  elements.fundRevenue.textContent = formatCurrency(numberOrNull(fundamentals.totalRevenue), currency);
  const isBank = normalizeCompanyType(company.companyType, company.ticker) === "bank";
  const naText = "N/A (not applicable)";
  const ebitdaNotApplicable = ebitdaAudit?.status === "not-applicable" || isBank;
  const fcfNotApplicable = fcfAudit?.status === "not-applicable";
  const naTitle = ebitdaAudit?.note ?? "EBITDA is not a meaningful metric for this company type.";
  if (ebitdaNotApplicable) {
    elements.fundEbitda.textContent = naText;
    elements.fundEbitda.className = "is-na";
    elements.fundEbitda.style.color = "var(--muted)";
    elements.fundEbitda.style.fontSize = "0.85em";
    elements.fundEbitda.title = naTitle;
  } else {
    elements.fundEbitda.textContent = formatCurrency(numberOrNull(fundamentals.ebitda), currency);
    elements.fundEbitda.className = "";
    elements.fundEbitda.style.color = "";
    elements.fundEbitda.style.fontSize = "";
    elements.fundEbitda.title = "";
  }
  const displayedCashFlow = numberOrNull(fundamentals.freeCashFlow);
  elements.fundFcf.textContent = fcfNotApplicable ? naText : formatCurrency(displayedCashFlow, currency);
  elements.fundFcf.className = fcfNotApplicable ? "is-na" : "";
  elements.fundFcf.title = fcfNotApplicable ? (fcfAudit?.note ?? "Not used for this company type.") : "";
  elements.fundAssets.textContent = formatCurrency(numberOrNull(fundamentals.totalAssets), currency);
  elements.fundEquity.textContent = formatCurrency(numberOrNull(fundamentals.bookEquity), currency);
  elements.fundLiabilities.textContent = formatCurrency(numberOrNull(fundamentals.totalLiabilities), currency);
  elements.fundDebt.textContent = formatCurrency(numberOrNull(fundamentals.totalDebt), currency);
  elements.fundCash.textContent = formatCurrency(numberOrNull(fundamentals.cash), currency);
  elements.fundShares.textContent = formatShares(numberOrNull(fundamentals.sharesOutstanding));
  elements.fundSharesLabel.textContent = verification?.status === "verified"
    ? "Outstanding shares (official report)"
    : "Outstanding shares (cached)";
  elements.fundShares.title = fundamentals.sharesOutstandingSource
    ? `Outstanding shares - ${fundamentals.sharesOutstandingSource}`
    : "Outstanding shares from Yahoo Finance";
  if (ebitdaNotApplicable) {
    elements.fundEvEbitda.textContent = naText;
    elements.fundEvEbitda.className = "is-na";
    elements.fundEvEbitda.style.color = "var(--muted)";
    elements.fundEvEbitda.style.fontSize = "0.85em";
    elements.fundEvEbitda.title = naTitle;
  } else {
    elements.fundEvEbitda.textContent = Number.isFinite(numberOrNull(fundamentals.evToEbitda))
      ? `${formatDecimal(numberOrNull(fundamentals.evToEbitda), 1)}x`
      : "-";
    elements.fundEvEbitda.className = "";
    elements.fundEvEbitda.style.color = "";
    elements.fundEvEbitda.style.fontSize = "";
    elements.fundEvEbitda.title = "";
  }
  elements.fundFcfYield.textContent = fcfNotApplicable ? naText : formatPercent(fcfYield, 1);
  elements.fundFcfYield.className = fcfNotApplicable ? "is-na" : (fcfYield === null ? "" : (fcfYield >= 0 ? "is-positive" : "is-negative"));
  renderMetricAudit(ebitdaAudit, elements.ebitdaAuditSummary, elements.ebitdaAuditBody, currency);
  renderMetricAudit(fcfAudit, elements.fcfAuditSummary, elements.fcfAuditBody, currency);
}

function drawDcfChart() {
  const company = getSelectedCompany();
  if (!company) return;

  const canvas = elements.dcfChart;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  context.setTransform(scale, 0, 0, scale, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const presentation = getAnalysisPresentation(company);
  const values = presentation.chartValues.filter((item) => Number.isFinite(item.value) && item.value >= 0);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#071b2e";
  context.fillRect(0, 0, width, height);

  if (!values.length) {
    context.fillStyle = "#b8c0ca";
    context.font = `15px ${CHART_FONT_STACK}`;
    context.textAlign = "center";
    context.fillText("This model is unavailable from the existing inputs for this company.", width / 2, height / 2);
    return;
  }

  const padding = { top: 48, right: 26, bottom: 54, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...values.map((item) => item.value));
  const chartMax = maxValue > 0 ? maxValue * 1.18 : 1;
  const slotWidth = chartWidth / values.length;
  const barWidth = Math.min(82, slotWidth * 0.56);

  context.font = `11px ${CHART_FONT_STACK}`;
  context.textAlign = "right";
  context.textBaseline = "middle";
  for (let line = 0; line <= 4; line += 1) {
    const ratio = line / 4;
    const y = height - padding.bottom - chartHeight * ratio;
    const tick = chartMax * ratio;
    context.strokeStyle = line === 0 ? "rgba(220, 229, 240, 0.34)" : "rgba(220, 229, 240, 0.1)";
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillStyle = "#7f8ea5";
    context.fillText(formatDecimal(tick, tick >= 100 ? 0 : 1), padding.left - 10, y);
  }

  values.forEach((item, index) => {
    const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
    const barHeight = Math.max(2, (item.value / chartMax) * chartHeight);
    const y = height - padding.bottom - barHeight;
    const gradient = context.createLinearGradient(0, y, 0, height - padding.bottom);
    if (state.scenario === "bear") {
      gradient.addColorStop(0, "#ff7694");
      gradient.addColorStop(1, "#a64267");
    } else if (state.scenario === "bull") {
      gradient.addColorStop(0, "#72c8ff");
      gradient.addColorStop(1, "#72d05f");
    } else {
      gradient.addColorStop(0, "#6aa7ff");
      gradient.addColorStop(1, state.analysisModel === "reverse-dcf" ? "#8f7cff" : "#72d05f");
    }

    context.fillStyle = gradient;
    roundedRect(context, x, y, barWidth, barHeight, 6);
    context.fill();

    context.fillStyle = "#f8fbff";
    context.font = `600 12px ${CHART_FONT_STACK}`;
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillText(formatDecimal(item.value, item.value >= 100 ? 0 : 2), x + barWidth / 2, Math.max(18, y - 10));
    context.fillStyle = "#b8c0ca";
    context.font = `12px ${CHART_FONT_STACK}`;
    context.fillText(item.label, x + barWidth / 2, height - 20);
  });
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function exportData() {
  const data = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    companies: state.companies
  }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "omxs30-intrinsic-value.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Data exported");
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed?.companies)) throw new Error("Missing companies");
      state.companies = mergeWithSeed(parsed.companies);
      state.selectedId = state.companies[0]?.id ?? null;
      saveCompanies();
      renderAll();
      showToast("Data imported");
    } catch {
      showToast("Import failed");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.addEventListener("resize", () => drawDcfChart());

initialize();
