const STORAGE_KEY = "intrinsic-value-omxs30-v1";
// Load the data deployed with this exact site revision. Using raw main here
// can mix a cached page with a newer/older dataset and also breaks local QA.
const RAW_DATA_BASE_URL = "data";
const FUNDAMENTALS_DATA_URL = `${RAW_DATA_BASE_URL}/fundamentals.json`;
const MARKET_DATA_URL = `${RAW_DATA_BASE_URL}/omxs30-data.json`;
const PRICE_DATA_URL = `${RAW_DATA_BASE_URL}/prices.json`;
const MARKETSCREENER_DATA_URL = `${RAW_DATA_BASE_URL}/marketscreener-fcf.json`;
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
    model: "NAV discount/premium + P/E",
    warning: "Use NAV discount/premium as the primary model; DCF is not reliable here."
  },
  cyclical: {
    label: "Asset-heavy cyclical",
    shortLabel: "Cyclical",
    model: "Normalized FCF + EV/EBITDA",
    warning: "Use normalized mid-cycle earnings or FCF, not one-year FCF."
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
  valuationSubtitle: document.querySelector("#valuationSubtitle"),
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
  analysisMetricsTitle: document.querySelector("#analysisMetricsTitle"),
  analysisMetricsNote: document.querySelector("#analysisMetricsNote"),
  analysisChartTitle: document.querySelector("#analysisChartTitle"),
  analysisChartSubtitle: document.querySelector("#analysisChartSubtitle"),
  analysisChartUnit: document.querySelector("#analysisChartUnit"),
  analysisModelTitle: document.querySelector("#analysisModelTitle"),
  analysisModelDescription: document.querySelector("#analysisModelDescription"),
  analysisFormula: document.querySelector("#analysisFormula"),
  analysisAssumptions: document.querySelector("#analysisAssumptions"),
  qualityRing: document.querySelector("#qualityRing"),
  qualitySummary: document.querySelector("#qualitySummary"),
  growthGap: document.querySelector("#growthGap"),
  qualityScore: document.querySelector("#qualityScore"),
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
      consensusGrowth: null,
      consensusGrowthSource: null,
      consensusGrowthAsOf: null,
      consensusGrowthAudit: { valid: false, reason: "Waiting for verified MarketScreener forecast data" },
      growth5yYears: null,
      fcfSeries: null,
      growth5ySource: null,
      growth5yUpdatedAt: null,
      wacc: round(defaults.wacc + ((index % 3) - 1) * 0.25, 1),
      terminalGrowth: defaults.terminalGrowth,
      targetPe: round(defaults.targetPe + ((index % 3) - 1) * 0.6, 1),
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

function mergeWithSeed(savedCompanies) {
  const defaults = createDefaultCompanies();
  const savedById = new Map(savedCompanies.map((company) => [company.id, company]));
  return defaults.map((company) => {
    const saved = savedById.get(company.id) ?? {};
    return {
      ...company,
      ...saved,
      companyType: normalizeCompanyType(saved.companyType, company.ticker),
      consensusGrowth: null,
      consensusGrowthSource: null,
      consensusGrowthAsOf: null,
      consensusGrowthAudit: { valid: false, reason: "Waiting for verified MarketScreener forecast data" }
    };
  });
}

function saveCompanies() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
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
      independentVerification: market.independentVerification ?? null,
      officialSource: market.officialSource ?? null,
      dataQuality: market.dataQuality ?? null,
      errors: market.errors ?? []
    };

    const marketBookValue = market.bookValuePerShare ?? market.equityPerShare;
    const fundamentalsUsable = market.dataQuality?.valuationReady !== false;
    const fundamentalInput = (value) => fundamentalsUsable ? numberOrNull(value) : null;

    return {
      ...seedCompany,
      ...current,
      companyType: normalizeCompanyType(market.companyType ?? current.companyType, seedCompany.ticker),
      marketPrice: numberOrFallback(market.marketPrice, current.marketPrice ?? seedCompany.marketPrice),
      fcfPerShare: fundamentalInput(market.fcfPerShare),
      ebitdaPerShare: fundamentalInput(market.ebitdaPerShare),
      eps: fundamentalInput(market.eps),
      netDebtPerShare: fundamentalInput(market.netDebtPerShare),
      bookValuePerShare: numberOrFallback(marketBookValue, current.bookValuePerShare ?? seedCompany.bookValuePerShare),
      navPerShare: numberOrFallback(market.navPerShare, current.navPerShare ?? seedCompany.navPerShare),
      roe: numberOrFallback(market.roe, current.roe ?? seedCompany.roe),
      normalizedFcfPerShare: numberOrFallback(market.normalizedFcfPerShare, current.normalizedFcfPerShare ?? seedCompany.normalizedFcfPerShare),
      normalizedEbitdaPerShare: numberOrFallback(market.normalizedEbitdaPerShare, current.normalizedEbitdaPerShare ?? seedCompany.normalizedEbitdaPerShare),
      // Historical 5yr FCF CAGR - always auto, computed by the data pipeline.
      growth5y: fundamentalInput(market.growth5y),
      growth5yYears: market.growth5yYears ?? current.growth5yYears ?? null,
      fcfSeries: market.fcfSeries ?? current.fcfSeries ?? seedCompany.fcfSeries ?? null,
      growth5ySource: market.growth5ySource ?? current.growth5ySource ?? null,
      growth5yUpdatedAt: market.growth5yUpdatedAt ?? market.dataUpdatedAt ?? current.growth5yUpdatedAt ?? null,
      // Populated only from the traceable MarketScreener FCF forecast below.
      consensusGrowth: null,
      consensusGrowthSource: null,
      consensusGrowthAsOf: null,
      consensusGrowthAudit: { valid: false, reason: "Waiting for verified MarketScreener forecast data" },
      targetPe: numberOrFallback(market.targetPe, current.targetPe ?? seedCompany.targetPe),
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

    return {
      ...company,
      marketPrice,
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

function calculateDcf(company, scenario = "base", growthOverride = null) {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const fcf = asNumber(company.fcfPerShare);
  const growth = (growthOverride ?? (asNumber(company.growth5y) + adjustment.growth)) / 100;
  const wacc = (asNumber(company.wacc) + adjustment.wacc) / 100;
  const terminalGrowth = asNumber(company.terminalGrowth) / 100;
  const netDebt = asNumber(company.netDebtPerShare);

  if (fcf <= 0 || wacc <= terminalGrowth || wacc <= 0) {
    return {
      value: NaN,
      flows: [],
      error: "DCF input conflict"
    };
  }

  const flows = [];
  let presentValue = 0;

  for (let year = 1; year <= 5; year += 1) {
    const cashFlow = fcf * ((1 + growth) ** year);
    const discounted = cashFlow / ((1 + wacc) ** year);
    presentValue += discounted;
    flows.push({ year, cashFlow, discounted });
  }

  const yearFiveCashFlow = flows[flows.length - 1].cashFlow;
  const terminalValue = (yearFiveCashFlow * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const discountedTerminal = terminalValue / ((1 + wacc) ** 5);

  return {
    value: presentValue + discountedTerminal - netDebt,
    flows,
    terminalValue,
    discountedTerminal,
    error: ""
  };
}

function calculatePeValue(company, scenario = "base") {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const eps = asNumber(company.eps);
  const targetPe = Math.max(0, asNumber(company.targetPe) + adjustment.targetPe);
  return eps > 0 && targetPe > 0 ? eps * targetPe : NaN;
}

function calculateEbitdaValue(company, scenario = "base", useNormalized = false) {
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const ebitdaPerShare = useNormalized
    ? (numberOrNull(company.normalizedEbitdaPerShare) ?? numberOrNull(company.ebitdaPerShare))
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

function weightedAverage(items) {
  const validItems = items.filter((item) => Number.isFinite(item.value) && item.weight > 0);
  const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);
  if (!validItems.length || totalWeight <= 0) return NaN;
  return validItems.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
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
  return numberOrNull(company.normalizedFcfPerShare) ?? numberOrNull(company.fcfPerShare);
}

function getNavPerShare(company) {
  return numberOrNull(company.navPerShare)
    ?? numberOrNull(company.bookValuePerShare)
    ?? numberOrNull(company.fundamentals?.analystTargetMeanPrice)
    ?? numberOrNull(company.fundamentals?.equityPerShare);
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

  return {
    dcf,
    peValue,
    ebitdaValue,
    currentPe,
    blendedValue: weightedAverage([
      { value: dcf.value, weight: 0.45 },
      { value: peValue, weight: 0.25 },
      { value: ebitdaValue, weight: 0.3 }
    ]),
    primaryLabel: "DCF value",
    primaryValue: dcf.value,
    secondaryLabel: "P/E value",
    secondaryValue: peValue,
    tertiaryLabel: "EV/EBITDA value",
    tertiaryValue: formatCurrency(ebitdaValue, company.currency ?? "SEK"),
    reverseLabel: "Reverse DCF",
    reverseValue: reverse.label,
    reverseSub: `Consensus ${formatPercent(asNumber(company.consensusGrowth), 1)}`,
    valueDescription: Number.isFinite(dcf.value) || Number.isFinite(peValue) || Number.isFinite(ebitdaValue)
      ? `${formatCurrency(dcf.value, company.currency ?? "SEK")} DCF | ${formatCurrency(peValue, company.currency ?? "SEK")} P/E | ${formatCurrency(ebitdaValue, company.currency ?? "SEK")} EV/EBITDA`
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

  return {
    dcf: { value: NaN, flows: [], error: "" },
    peValue,
    currentPe,
    blendedValue: weightedAverage([
      { value: pbValue, weight: 0.65 },
      { value: peValue, weight: 0.35 }
    ]),
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
    valueDescription: Number.isFinite(pbValue)
      ? `${formatDecimal(justifiedPb, 1)}x justified P/B | ${formatCurrency(peValue, currency)} P/E`
      : "Needs book equity per share and ROE",
    modelSupportScore: Number.isFinite(roeSpread) ? clamp(50 + roeSpread * 5, 0, 100) : 50,
    modelWarning: Number.isFinite(pbValue) ? "" : "Add book value per share and ROE for the bank model.",
    chartTitle: "Bank model"
  };
}

function calculateInvestmentModel(company, scenario) {
  const currency = company.currency ?? "SEK";
  const price = asNumber(company.marketPrice);
  const navPerShare = getNavPerShare(company);
  const peValue = calculatePeValue(company, scenario);
  const currentPe = asNumber(company.eps) > 0 ? price / asNumber(company.eps) : NaN;
  const peUseful = Number.isFinite(peValue) && Number.isFinite(currentPe) && currentPe > 0 && currentPe < 45;
  const navDiscount = navPerShare && navPerShare > 0 ? ((navPerShare - price) / navPerShare) * 100 : NaN;

  return {
    dcf: { value: NaN, flows: [], error: "" },
    peValue,
    currentPe,
    blendedValue: weightedAverage([
      { value: navPerShare, weight: 0.8 },
      { value: peUseful ? peValue : NaN, weight: 0.2 }
    ]),
    primaryLabel: "NAV value",
    primaryValue: navPerShare,
    secondaryLabel: "P/E value",
    secondaryValue: peUseful ? peValue : NaN,
    tertiaryLabel: "NAV discount",
    tertiaryValue: formatPercent(navDiscount, 1),
    reverseLabel: "NAV discount",
    reverseValue: formatPercent(navDiscount, 1),
    reverseSub: "Discount/premium to NAV",
    valueDescription: Number.isFinite(navPerShare)
      ? `${formatCurrency(navPerShare, currency)} NAV | ${peUseful ? `${formatCurrency(peValue, currency)} P/E` : "P/E not useful"}`
      : "Needs NAV per share",
    modelSupportScore: Number.isFinite(navDiscount) ? clamp(50 + navDiscount * 1.2, 0, 100) : 50,
    modelWarning: Number.isFinite(navPerShare) ? "" : "Add NAV per share for the investment-company model.",
    chartTitle: "Investment company model"
  };
}

function calculateCyclicalModel(company, scenario) {
  const currency = company.currency ?? "SEK";
  const price = asNumber(company.marketPrice);
  const normalizedFcf = getNormalizedFcfPerShare(company);
  const normalizedMultiple = clamp(asNumber(company.targetPe) * 0.85, 7, 16);
  const netDebt = asNumber(company.netDebtPerShare);
  const normalizedFcfValue = normalizedFcf && normalizedFcf > 0
    ? normalizedFcf * normalizedMultiple - netDebt
    : NaN;
  const ebitdaValue = calculateEbitdaValue(company, scenario, true);
  const peValue = calculatePeValue(company, scenario);
  const currentPe = asNumber(company.eps) > 0 ? price / asNumber(company.eps) : NaN;
  const normalizedFcfYield = price > 0 && normalizedFcf && normalizedFcf > 0 ? (normalizedFcf / price) * 100 : NaN;

  return {
    dcf: { value: NaN, flows: [], error: "" },
    peValue,
    ebitdaValue,
    currentPe,
    blendedValue: weightedAverage([
      { value: normalizedFcfValue, weight: 0.5 },
      { value: ebitdaValue, weight: 0.3 },
      { value: peValue, weight: 0.2 }
    ]),
    primaryLabel: "Norm. FCF value",
    primaryValue: normalizedFcfValue,
    secondaryLabel: "EV/EBITDA value",
    secondaryValue: ebitdaValue,
    tertiaryLabel: "Norm. FCF yield",
    tertiaryValue: formatPercent(normalizedFcfYield, 1),
    reverseLabel: "Norm. FCF yield",
    reverseValue: formatPercent(normalizedFcfYield, 1),
    reverseSub: "Mid-cycle cash flow yield",
    valueDescription: Number.isFinite(normalizedFcfValue) || Number.isFinite(ebitdaValue)
      ? `${formatDecimal(normalizedMultiple, 1)}x normalized FCF | ${formatCurrency(ebitdaValue, currency)} EV/EBITDA | ${formatCurrency(peValue, currency)} P/E`
      : "Needs normalized FCF or EBITDA per share",
    modelSupportScore: Number.isFinite(normalizedFcfYield) ? clamp(45 + normalizedFcfYield * 5, 0, 100) : 50,
    modelWarning: Number.isFinite(normalizedFcfValue) || Number.isFinite(ebitdaValue) ? "" : "Add normalized FCF or EBITDA per share for the cyclical model.",
    chartTitle: "Normalized FCF model"
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

function getMarketScreenerNextFyAudit(row) {
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

  const actual = Array.isArray(row.fcfHistory)
    ? row.fcfHistory.filter((item) => Number.isFinite(Number(item?.year)) && numberOrNull(item?.fcf) !== null)
    : [];
  const forecast = Array.isArray(row.fcfForecast)
    ? row.fcfForecast.filter((item) => Number.isFinite(Number(item?.year)) && numberOrNull(item?.fcf) !== null)
    : [];
  actual.sort((left, right) => Number(left.year) - Number(right.year));
  forecast.sort((left, right) => Number(left.year) - Number(right.year));
  if (!actual.length || !forecast.length) {
    return { valid: false, reason: "Latest reported and next-year forecast FCF are both required" };
  }

  const base = actual[actual.length - 1];
  const estimate = forecast[0];
  const baseYear = Number(base.year);
  const estimateYear = Number(estimate.year);
  const baseFcf = Number(base.fcf);
  const estimateFcf = Number(estimate.fcf);
  if (estimateYear !== baseYear + 1) {
    return { valid: false, reason: "The first forecast is not the fiscal year immediately after the latest actual" };
  }
  if (baseFcf <= 0 || estimateFcf <= 0) {
    return { valid: false, reason: "Next-FY growth is not meaningful when either FCF value is zero or negative" };
  }

  const growth = estimateFcf / baseFcf - 1;
  const storedForecast = Array.isArray(row.forecastYoy)
    ? row.forecastYoy.find((item) => Number(item?.year) === estimateYear)
    : null;
  const storedGrowth = numberOrNull(storedForecast?.growth);
  if (storedGrowth === null || Math.abs(storedGrowth - growth) > 0.00001) {
    return { valid: false, reason: "The stored MarketScreener growth rate does not reconcile to its FCF values" };
  }

  return {
    valid: true,
    growth,
    baseYear,
    estimateYear,
    baseFcf,
    estimateFcf,
    currency: row.currency ?? "SEK",
    unit: row.unit ?? "million",
    sourceUrl: row.sourceUrl,
    retrievedAt: row.retrievedAt,
    ageDays
  };
}

function applyMarketScreenerNextFyGrowth(companies, rows) {
  return companies.map((company) => {
    const category = normalizeCompanyType(company.companyType, company.ticker);
    if (category === "bank" || category === "investment") {
      return {
        ...company,
        consensusGrowth: null,
        consensusGrowthSource: "Not applicable for this company type",
        consensusGrowthAsOf: null,
        consensusGrowthAudit: { valid: false, notApplicable: true }
      };
    }

    const audit = getMarketScreenerNextFyAudit(rows?.[company.id]);
    return {
      ...company,
      consensusGrowth: audit.valid ? audit.growth * 100 : null,
      consensusGrowthSource: audit.valid ? "MarketScreener analyst-consensus FCF forecast" : null,
      consensusGrowthAsOf: audit.valid ? audit.retrievedAt : null,
      consensusGrowthAudit: audit
    };
  });
}

async function loadMarketScreenerFcf() {
  try {
    const response = await fetch(`${MARKETSCREENER_DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    marketScreenerFcf = payload?.companies ?? null;
    state.companies = applyMarketScreenerNextFyGrowth(state.companies, marketScreenerFcf);
    renderAll();
  } catch (error) {
    marketScreenerFcf = null;
    state.companies = applyMarketScreenerNextFyGrowth(state.companies, null);
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
      company[field] = field === "notes" ? event.target.value : asNumber(event.target.value);
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
    state.companies = applyMarketScreenerNextFyGrowth(state.companies, marketScreenerFcf);
  }
  renderDataStatus();
  renderCompanyList();
  renderForm();
  renderDependentViews();
}

function renderDependentViews() {
  renderHeader();
  renderMetrics();
  renderOutlook();
  renderRiktkurser();
  renderSyntheticPortfolio();
  renderFundamentals();
  renderCompanyList();
  drawDcfChart();
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
  elements.valuationSubtitle.textContent = `Understand ${company.name} through the selected model and scenario`;
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
    input.value = roundFieldValue(company[input.dataset.field]);
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
    const years = Number(company.growth5yYears);
    const label = Number.isFinite(years) && years > 0 && years < 5 ? `${years}yr CAGR` : "5yr CAGR";
    if (!Number.isFinite(asNumber(company.growth5y)) || company.growth5y === null || company.growth5y === "") {
      cagrMeta.textContent = "N/A - not enough positive FCF history";
    } else {
      cagrMeta.textContent = `${label} | Source: ${company.growth5ySource ?? "Official company reports"} | Updated: ${formatShortDate(company.growth5yUpdatedAt) ?? "n/a"}`;
    }
  }

  const consensusMeta = document.querySelector("#consensusGrowthMeta");
  if (consensusMeta) {
    const audit = company.consensusGrowthAudit ?? getMarketScreenerNextFyAudit(marketScreenerFcf?.[company?.id]);
    if (audit?.notApplicable) {
      consensusMeta.textContent = "N/A — use EPS/book-value growth for banks and NAV growth for investment companies";
    } else if (!audit?.valid) {
      consensusMeta.textContent = `Unavailable — ${audit?.reason ?? "no validated forecast data"}`;
    } else {
      const asOf = formatShortDate(audit.retrievedAt);
      consensusMeta.innerHTML =
        `${audit.baseYear}A → ${audit.estimateYear}E | ` +
        `<a href="${escapeHtml(audit.sourceUrl)}" target="_blank" rel="noopener">MarketScreener cash-flow forecast</a>` +
        (asOf ? ` | Retrieved ${escapeHtml(asOf)}` : "");
    }
  }
}

function formatConsensusFcf(value, audit) {
  if (!Number.isFinite(value)) return "n/a";
  const formatted = Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${formatted} ${audit.unit ?? "million"} ${audit.currency ?? "SEK"}`;
}

function renderConsensusGrowthBreakdown(company) {
  const container = document.querySelector("#consensusGrowthBreakdown");
  const details = document.querySelector("#consensusGrowthDetails");
  if (!container || !details) return;

  const audit = company.consensusGrowthAudit ?? getMarketScreenerNextFyAudit(marketScreenerFcf?.[company?.id]);
  if (audit?.notApplicable) {
    container.innerHTML = "<p class=\"cagr-note\">FCF growth is not used for this company type.</p>";
    details.open = false;
    return;
  }
  if (!audit?.valid) {
    container.innerHTML = `<p class="cagr-note">${escapeHtml(audit?.reason ?? "No validated MarketScreener forecast is available.")}</p>`;
    details.open = false;
    return;
  }

  const percentage = audit.growth * 100;
  details.open = true;
  container.innerHTML = `
    <table class="cagr-table">
      <thead><tr><th>Period</th><th>Free cash flow</th><th>Basis</th></tr></thead>
      <tbody>
        <tr><td>${audit.baseYear}A</td><td>${escapeHtml(formatConsensusFcf(audit.baseFcf, audit))}</td><td>Latest reported</td></tr>
        <tr><td>${audit.estimateYear}E</td><td>${escapeHtml(formatConsensusFcf(audit.estimateFcf, audit))}</td><td>Analyst consensus</td></tr>
      </tbody>
    </table>
    <p class="cagr-formula">(${escapeHtml(formatConsensusFcf(audit.estimateFcf, audit))} ÷ ${escapeHtml(formatConsensusFcf(audit.baseFcf, audit))}) − 1 = <strong>${percentage.toFixed(2)} %</strong></p>
    <p class="cagr-note">Calculated by this dashboard from the displayed FCF values · <a href="${escapeHtml(audit.sourceUrl)}" target="_blank" rel="noopener">Open MarketScreener source</a> · Retrieved ${escapeHtml(formatShortDate(audit.retrievedAt) ?? "date unavailable")}</p>`;
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

function renderCagrBreakdown(company) {
  const host = document.querySelector("#cagrBreakdown");
  if (!host) return;

  const currency = company.currency ?? "SEK";
  const series = Array.isArray(company.fcfSeries)
    ? company.fcfSeries.map(Number).filter((value) => Number.isFinite(value))
    : [];
  const cagr = asNumber(company.growth5y);
  const source = company.growth5ySource ?? "not set";
  const updated = formatShortDate(company.growth5yUpdatedAt) ?? "n/a";

  if (!series.length) {
    host.innerHTML = `
      <p class="cagr-note">No free-cash-flow history stored for ${company.ticker} yet.</p>
      <p class="cagr-note">The pipeline saves the FCF series next time the data workflow runs. Current stored CAGR: <strong>${Number.isFinite(cagr) ? `${cagr.toFixed(2)} %` : "N/A"}</strong> (source: ${source}, updated ${updated}).</p>
    `;
    return;
  }

  // Mirror the pipeline: newest-first window, shrink until both ends are positive.
  let window = series.slice(0, 6);
  while (window.length >= 2 && !(window[0] > 0 && window[window.length - 1] > 0)) {
    window = window.slice(0, -1);
  }
  const usable = window.length >= 2 && window[0] > 0 && window[window.length - 1] > 0;
  const years = usable ? window.length - 1 : null;
  const newest = usable ? window[0] : null;
  const oldest = usable ? window[window.length - 1] : null;
  const computed = usable ? ((newest / oldest) ** (1 / years) - 1) * 100 : null;

  const rows = series
    .map((value, index) => {
      const label = index === 0 ? "Latest FY" : `FY -${index}`;
      const inWindow = index < window.length;
      const prev = series[index + 1];
      const yoyValue = Number.isFinite(prev) && prev > 0 && value > 0 ? (value / prev - 1) * 100 : null;
      const yoy = yoyValue === null
        ? '<span class="cagr-na">n/a</span>'
        : `<span class="${yoyValue >= 0 ? "cagr-up" : "cagr-down"}">${yoyValue >= 0 ? "+" : ""}${yoyValue.toFixed(1)} %</span>`;
      return `<tr class="${inWindow ? "" : "is-muted"}">
        <td>${label}</td>
        <td>${formatFcfAmount(value, currency)}</td>
        <td>${yoy}</td>
        <td>${inWindow ? "used" : "outside window"}</td>
      </tr>`;
    })
    .join("");

  host.innerHTML = `
    <div class="cagr-head">
      <div>
        <span class="cagr-label">${usable ? `${years}yr FCF CAGR` : "FCF CAGR"}</span>
        <strong class="cagr-value">${computed === null ? "N/A" : `${computed.toFixed(2)} %`}</strong>
      </div>
      <p class="cagr-note">Source: ${source} | Updated: ${updated}</p>
    </div>
    <table class="cagr-table">
      <thead><tr><th>Period</th><th>Free cash flow</th><th>Growth</th><th>Window</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="cagr-formula">CAGR = (FCF<sub>latest</sub> / FCF<sub>oldest</sub>)<sup>1/${years ?? "n"}</sup> - 1</p>
    ${usable
      ? `<p class="cagr-formula">= (${formatFcfAmount(newest, currency)} / ${formatFcfAmount(oldest, currency)})<sup>1/${years}</sup> - 1 = <strong>${computed.toFixed(2)} %</strong></p>`
      : `<p class="cagr-note">Cannot compute: the window needs a positive start and end value.</p>`}
    <p class="cagr-note">Stored value used by the DCF: <strong>${Number.isFinite(cagr) ? `${cagr.toFixed(2)} %` : "N/A"}</strong>. Consensus FCF growth is a separate input and never feeds this calculation.</p>
  `;
}


function getScenarioExplanation(scenario = state.scenario) {
  if (scenario === "bull") return "Bull applies FCF growth +2.0 pp, WACC −0.7 pp and target P/E +2.0x.";
  if (scenario === "bear") return "Bear applies FCF growth −2.0 pp, WACC +1.0 pp and target P/E −2.0x.";
  return "Base uses the saved growth, WACC and target P/E without adjustment.";
}

function getAnalysisPresentation(company) {
  const currency = company.currency ?? "SEK";
  const scenario = state.scenario;
  const adjustment = scenarioAdjustments[scenario] ?? scenarioAdjustments.base;
  const scenarioLabel = adjustment.label;
  const category = normalizeCompanyType(company.companyType, company.ticker);
  const price = asNumber(company.marketPrice);
  const currentFcf = asNumber(company.fcfPerShare);
  const growth = asNumber(company.growth5y) + adjustment.growth;
  const wacc = asNumber(company.wacc) + adjustment.wacc;
  const targetPe = Math.max(0, asNumber(company.targetPe) + adjustment.targetPe);
  const difference = (value) => price > 0 && Number.isFinite(value) ? ((value - price) / price) * 100 : NaN;
  const differenceText = (value) => {
    const result = difference(value);
    if (!Number.isFinite(result)) return "Cannot calculate from current inputs";
    return `${formatPercent(result, 1)} ${result >= 0 ? "upside" : "downside"} vs current price`;
  };

  if (state.analysisModel === "pe") {
    const value = calculatePeValue(company, scenario);
    const currentPe = asNumber(company.eps) > 0 ? price / asNumber(company.eps) : NaN;
    return {
      key: "pe",
      title: `P/E · ${scenarioLabel}`,
      note: getScenarioExplanation(scenario),
      chartTitle: "P/E valuation compared with market price",
      chartSubtitle: `${formatDecimal(asNumber(company.eps), 2)} ${currency} EPS × ${formatDecimal(targetPe, 1)}x target P/E`,
      chartUnit: `${currency} / share`,
      modelTitle: "P/E — Price / Earnings",
      modelDescription: "Values one share by multiplying earnings per share by the selected target P/E multiple.",
      formula: "EPS × target P/E = value per share",
      assumptions: [
        ["EPS", formatTickerMoney(asNumber(company.eps), currency)],
        ["Target P/E", `${formatDecimal(targetPe, 1)}x`],
        ["Current P/E", Number.isFinite(currentPe) ? `${formatDecimal(currentPe, 1)}x` : "-"]
      ],
      metrics: [
        ["P/E value / share", formatTickerMoney(value, currency), differenceText(value)],
        ["Current price", formatTickerMoney(price, currency), "Market price input"],
        ["EPS", formatTickerMoney(asNumber(company.eps), currency), "Earnings per share input"],
        ["Target P/E", Number.isFinite(targetPe) ? `${formatDecimal(targetPe, 1)}x` : "-", `${formatDecimal(asNumber(company.targetPe), 1)}x saved input`]
      ],
      chartValues: [
        { label: "Current price", value: price },
        { label: `${scenarioLabel} value`, value }
      ]
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
        ? "Works backwards from the current share price to find the annual five-year FCF growth required by the market."
        : "Reverse DCF is not used for this company type because ordinary free cash flow is not its primary valuation basis.",
      formula: "Solve DCF growth until DCF value = current price",
      assumptions: [
        ["Current price", formatTickerMoney(price, currency)],
        ["Starting FCF / share", formatTickerMoney(currentFcf, currency)],
        ["WACC", formatPercent(wacc, 1)],
        ["Consensus next FY", Number.isFinite(consensus) ? `${formatPercent(consensus, 1)} (different horizon)` : "N/A"]
      ],
      metrics: [
        ["Required 5yr FCF growth", reverse.label, "Annual growth implied by today’s price"],
        ["Current price", formatTickerMoney(price, currency), "The value the model solves back to"],
        ["Starting FCF / share", formatTickerMoney(currentFcf, currency), "Latest FCF input"],
        ["WACC", formatPercent(wacc, 1), `${formatPercent(asNumber(company.wacc), 1)} saved input`]
      ],
      chartValues: [{ label: "Actual", value: currentFcf }, ...reverseFlows.map((flow) => ({ label: `Y${flow.year}E`, value: flow.cashFlow }))]
    };
  }

  const dcf = category === "operating" ? calculateDcf(company, scenario) : { value: NaN, flows: [] };
  return {
    key: "dcf",
    title: `DCF · ${scenarioLabel}`,
    note: getScenarioExplanation(scenario),
    chartTitle: "Projected free cash flow / share",
    chartSubtitle: `${scenarioLabel} five-year forecast from the current FCF / share input`,
    chartUnit: `${currency} / share`,
    modelTitle: "DCF — Discounted Cash Flow",
    modelDescription: category === "operating"
      ? "Projects five years of free cash flow, discounts those cash flows and the terminal value back to today, then subtracts net debt."
      : "DCF is not used for this company type in the dashboard’s existing category model.",
    formula: "Present value of 5yr FCF + terminal value − net debt",
    assumptions: [
      ["Starting FCF / share", formatTickerMoney(currentFcf, currency)],
      ["FCF growth", formatPercent(growth, 1)],
      ["WACC", formatPercent(wacc, 1)],
      ["Terminal growth", formatPercent(asNumber(company.terminalGrowth), 1)]
    ],
    metrics: [
      ["Intrinsic value / share", formatTickerMoney(dcf.value, currency), differenceText(dcf.value)],
      ["Current price", formatTickerMoney(price, currency), "Market price input"],
      ["5yr FCF growth", formatPercent(growth, 1), `${formatPercent(asNumber(company.growth5y), 1)} saved input`],
      ["WACC", formatPercent(wacc, 1), `${formatPercent(asNumber(company.wacc), 1)} saved input`]
    ],
    chartValues: [{ label: "Actual", value: currentFcf }, ...dcf.flows.map((flow) => ({ label: `Y${flow.year}E`, value: flow.cashFlow }))]
  };
}

function renderAnalysis(company) {
  const presentation = getAnalysisPresentation(company);
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
  elements.analysisModelDescription.textContent = presentation.modelDescription;
  elements.analysisFormula.textContent = presentation.formula;
  elements.analysisAssumptions.innerHTML = presentation.assumptions
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

function renderMetrics() {
  const company = getSelectedCompany();
  if (!company) return;

  const calc = calculateCompany(company);
  elements.metricValue.textContent = formatCurrency(calc.blendedValue, company.currency ?? "SEK");
  elements.metricValueSub.textContent = calc.model.valueDescription;
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

function renderOutlook() {
  const company = getSelectedCompany();
  if (!company) return;

  const calc = calculateCompany(company);
  elements.qualityRing.textContent = calc.qualityScore;
  elements.qualityRing.style.borderColor = calc.qualityScore >= 75 ? "var(--green)" : calc.qualityScore >= 55 ? "var(--amber)" : "var(--red)";
  elements.qualitySummary.textContent = `${company.industryScore}/5 | ${company.companyScore}/5 | ${company.leadershipScore}/5`;
  elements.growthGap.textContent = formatPercent(calc.growthGap, 1);
  elements.growthGap.className = calc.growthGap >= 0 ? "is-positive" : "is-negative";
  elements.qualityScore.textContent = `${calc.qualityScore}/100`;

  document.querySelectorAll("[data-score-value]").forEach((label) => {
    const field = label.dataset.scoreValue;
    label.textContent = `${company[field] ?? 3}/5`;
  });
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
  elements.fundFcfLabel.textContent = verification?.status === "verified" && fundamentals.cashFlowMetricLabel
    ? fundamentals.cashFlowMetricLabel
    : verification?.status === "verified" ? "Free cash flow (TTM)" : "Free cash flow (cached TTM)";
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
  const naTitle = "EBITDA is not a meaningful metric for banks.";
  if (isBank) {
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
  const displayedCashFlow = verification?.status === "verified" && fundamentals.cashFlowMetricLabel
    ? numberOrNull(fundamentals.operatingCashFlow)
    : numberOrNull(fundamentals.freeCashFlow);
  elements.fundFcf.textContent = formatCurrency(displayedCashFlow, currency);
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
  if (isBank) {
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
  elements.fundFcfYield.textContent = formatPercent(fcfYield, 1);
  elements.fundFcfYield.className = fcfYield === null ? "" : (fcfYield >= 0 ? "is-positive" : "is-negative");
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
