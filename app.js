const STORAGE_KEY = "intrinsic-value-omxs30-v1";
const RAW_DATA_BASE_URL = "https://raw.githubusercontent.com/BorisOttosson/OMXS30-Intrinsic-Value/main/data";
const FUNDAMENTALS_DATA_URL = `${RAW_DATA_BASE_URL}/fundamentals.json`;
const MARKET_DATA_URL = `${RAW_DATA_BASE_URL}/omxs30-data.json`;
const PRICE_DATA_URL = `${RAW_DATA_BASE_URL}/prices.json`;
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

const scenarioAdjustments = {
  base: { label: "Base case", growth: 0, wacc: 0, targetPe: 0 },
  bear: { label: "Bear case", growth: -2.0, wacc: 1.0, targetPe: -2.0 },
  bull: { label: "Bull case", growth: 2.0, wacc: -0.7, targetPe: 2.0 }
};

let state = {
  companies: loadCompanies(),
  selectedId: null,
  scenario: "base",
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
  dcfValue: document.querySelector("#dcfValue"),
  peValue: document.querySelector("#peValue"),
  currentPe: document.querySelector("#currentPe"),
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
  fundMarketCap: document.querySelector("#fundMarketCap"),
  fundRevenue: document.querySelector("#fundRevenue"),
  fundEbitda: document.querySelector("#fundEbitda"),
  fundFcf: document.querySelector("#fundFcf"),
  fundAssets: document.querySelector("#fundAssets"),
  fundEquity: document.querySelector("#fundEquity"),
  fundLiabilities: document.querySelector("#fundLiabilities"),
  fundDebt: document.querySelector("#fundDebt"),
  fundCash: document.querySelector("#fundCash"),
  fundShares: document.querySelector("#fundShares"),
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
      consensusGrowth: round(defaults.consensusGrowth + ((index % 4) - 1) * 0.25, 1),
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
      companyType: normalizeCompanyType(saved.companyType, company.ticker)
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
    nextMarketData.fundamentalsProvider = payload.provider ?? "Yahoo Finance via yfinance";
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
      totalRevenue: numberOrNull(market.totalRevenue),
      ebitda: numberOrNull(market.ebitda),
      ebit: numberOrNull(market.ebit),
      netIncome: numberOrNull(market.netIncome),
      operatingCashFlow: numberOrNull(market.operatingCashFlow),
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
      trailingPe: numberOrNull(market.trailingPe),
      forwardPe: numberOrNull(market.forwardPe),
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
      errors: market.errors ?? []
    };

    const marketBookValue = market.bookValuePerShare ?? market.equityPerShare;

    return {
      ...seedCompany,
      ...current,
      companyType: normalizeCompanyType(market.companyType ?? current.companyType, seedCompany.ticker),
      marketPrice: numberOrFallback(market.marketPrice, current.marketPrice ?? seedCompany.marketPrice),
      fcfPerShare: numberOrFallback(market.fcfPerShare, current.fcfPerShare ?? seedCompany.fcfPerShare),
      ebitdaPerShare: numberOrFallback(market.ebitdaPerShare, current.ebitdaPerShare ?? seedCompany.ebitdaPerShare),
      eps: numberOrFallback(market.eps, current.eps ?? seedCompany.eps),
      netDebtPerShare: numberOrFallback(market.netDebtPerShare, current.netDebtPerShare ?? seedCompany.netDebtPerShare),
      bookValuePerShare: numberOrFallback(marketBookValue, current.bookValuePerShare ?? seedCompany.bookValuePerShare),
      navPerShare: numberOrFallback(market.navPerShare, current.navPerShare ?? seedCompany.navPerShare),
      roe: numberOrFallback(market.roe, current.roe ?? seedCompany.roe),
      normalizedFcfPerShare: numberOrFallback(market.normalizedFcfPerShare, current.normalizedFcfPerShare ?? seedCompany.normalizedFcfPerShare),
      normalizedEbitdaPerShare: numberOrFallback(market.normalizedEbitdaPerShare, current.normalizedEbitdaPerShare ?? seedCompany.normalizedEbitdaPerShare),
      growth5y: numberOrFallback(market.growth5y, current.growth5y ?? seedCompany.growth5y),
      consensusGrowth: numberOrFallback(market.consensusGrowth, current.consensusGrowth ?? seedCompany.consensusGrowth),
      targetPe: numberOrFallback(market.targetPe, current.targetPe ?? seedCompany.targetPe),
      targetEvToEbitda: numberOrFallback(market.targetEvToEbitda, current.targetEvToEbitda ?? seedCompany.targetEvToEbitda),
      currency: market.currency ?? current.currency ?? "SEK",
      dataUpdatedAt: market.dataUpdatedAt ?? current.dataUpdatedAt ?? null,
      source: market.source ? `${market.source} + manual assumptions` : (current.source ?? seedCompany.source),
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
  const yearQuarter = normalized.match(/\b(\d{4})\s*Q([1-4])\b/i);
  if (yearQuarter) return `Q${yearQuarter[2]} ${yearQuarter[1]}`;
  const quarterYear = normalized.match(/\bQ([1-4])\s*(\d{4})\b/i);
  if (quarterYear) return `Q${quarterYear[1]} ${quarterYear[2]}`;
  if (/^\d{4}$/.test(normalized)) return normalized;
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
  const fundamentalsLabel = fundamentalsProvider.includes("BörsAPI")
    ? "BörsAPI fundamentals"
    : fundamentalsProvider.includes("Financial Modeling Prep")
    ? "FMP fundamentals"
    : fundamentalsProvider.includes("EODHD")
      ? "EODHD fundamentals"
      : "Yahoo fundamentals";
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
  const reverse = calculateReverseDcf(company);
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
  const category = normalizeCompanyType(company.companyType, company.ticker);
  if (category === "bank") return calculateBankModel(company, scenario);
  if (category === "investment") return calculateInvestmentModel(company, scenario);
  if (category === "cyclical") return calculateCyclicalModel(company, scenario);
  return calculateOperatingModel(company, scenario);
}

function calculateReverseDcf(company) {
  const price = asNumber(company.marketPrice);
  if (price <= 0 || asNumber(company.fcfPerShare) <= 0) return { value: NaN, label: "-" };

  const valueAt = (growth) => calculateDcf(company, "base", growth * 100).value;
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

function initialize() {
  populateSectorFilter();
  bindEvents();
  renderAll();
  loadMarketData({ quiet: true });
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
    if (!field && !quality) return;

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
      document.querySelectorAll("[data-scenario]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderDependentViews();
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
  elements.inputBadge.textContent = category !== "operating"
    ? getCompanyModelLabel(category)
    : (company.source !== "Sample input" && company.source !== "Edited" ? "Fundamentals loaded" : (company.source === "Edited" ? "Edited inputs" : "Sample inputs"));
  elements.stanceBadge.textContent = calc.stance.label;
  elements.stanceBadge.className = `status-badge ${calc.stance.key}`;
  elements.valuationSubtitle.textContent = `${scenarioAdjustments[state.scenario].label} | ${getCompanyModelLabel(category)}`;
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
    .sort((left, right) => right.calc.researchScore - left.calc.researchScore);

  elements.companyList.innerHTML = filtered.map(({ company, calc }) => {
    const mosClass = calc.marginOfSafety >= 0 ? "is-positive" : "is-negative";
    return `
      <button class="company-row ${company.id === state.selectedId ? "is-active" : ""}" type="button" data-company-id="${company.id}" data-logo-fit="${escapeHtml(getCompanyLogoFit(company))}">
        <span class="company-price">
          <strong>${formatPriceNumber(asNumber(company.marketPrice))}</strong>
          <small>${escapeHtml(company.currency ?? "SEK")}</small>
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

function renderForm() {
  const company = getSelectedCompany();
  if (!company) return;

  document.querySelectorAll("[data-field]").forEach((input) => {
    input.value = company[input.dataset.field] ?? "";
  });

  document.querySelectorAll("[data-quality]").forEach((input) => {
    input.value = company[input.dataset.quality] ?? 3;
  });
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

  elements.valuationPrimaryLabel.textContent = calc.model.primaryLabel;
  elements.valuationSecondaryLabel.textContent = calc.model.secondaryLabel;
  elements.valuationTertiaryLabel.textContent = calc.model.tertiaryLabel;
  elements.dcfValue.textContent = formatCurrency(calc.model.primaryValue, company.currency ?? "SEK");
  elements.peValue.textContent = formatCurrency(calc.model.secondaryValue, company.currency ?? "SEK");
  elements.currentPe.textContent = calc.model.tertiaryValue;
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
      <span>${escapeHtml(item.date ?? "-")}</span>
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

  elements.fundamentalsSubtitle.textContent = [
    company.source,
    updatedText,
    ...statementReferences
  ].filter(Boolean).join(" | ");
  elements.fundMarketCap.textContent = formatCurrency(numberOrNull(fundamentals.marketCap), currency);
  elements.fundRevenue.textContent = formatCurrency(numberOrNull(fundamentals.totalRevenue), currency);
  elements.fundEbitda.textContent = formatCurrency(numberOrNull(fundamentals.ebitda), currency);
  elements.fundFcf.textContent = formatCurrency(numberOrNull(fundamentals.freeCashFlow), currency);
  elements.fundAssets.textContent = formatCurrency(numberOrNull(fundamentals.totalAssets), currency);
  elements.fundEquity.textContent = formatCurrency(numberOrNull(fundamentals.bookEquity), currency);
  elements.fundLiabilities.textContent = formatCurrency(numberOrNull(fundamentals.totalLiabilities), currency);
  elements.fundDebt.textContent = formatCurrency(numberOrNull(fundamentals.totalDebt), currency);
  elements.fundCash.textContent = formatCurrency(numberOrNull(fundamentals.cash), currency);
  elements.fundShares.textContent = formatShares(numberOrNull(fundamentals.sharesOutstanding));
  elements.fundEvEbitda.textContent = Number.isFinite(numberOrNull(fundamentals.evToEbitda))
    ? `${formatDecimal(numberOrNull(fundamentals.evToEbitda), 1)}x`
    : "-";
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
  const calc = calculateCompany(company);
  const flows = calc.dcf.flows;
  const category = normalizeCompanyType(company.companyType, company.ticker);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#071b2e";
  context.fillRect(0, 0, width, height);

  if (category !== "operating") {
    context.fillStyle = "#f8fbff";
    context.font = `14px ${CHART_FONT_STACK}`;
    context.fillText(calc.model.chartTitle, 22, 34);
    context.fillStyle = "#b8c0ca";
    context.fillText(calc.model.valueDescription, 22, 62);
    context.fillText(`${calc.model.primaryLabel}: ${formatCurrency(calc.model.primaryValue, company.currency ?? "SEK")}`, 22, 92);
    context.fillText(`${calc.model.secondaryLabel}: ${formatCurrency(calc.model.secondaryValue, company.currency ?? "SEK")}`, 22, 120);
    return;
  }

  if (!flows.length) {
    context.fillStyle = "#b8c0ca";
    context.font = `14px ${CHART_FONT_STACK}`;
    context.fillText("DCF input conflict", 22, 34);
    return;
  }

  const padding = { top: 26, right: 22, bottom: 42, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxFlow = Math.max(...flows.map((flow) => flow.cashFlow), asNumber(company.fcfPerShare));
  const barWidth = Math.min(58, chartWidth / flows.length * 0.54);

  context.strokeStyle = "rgba(220, 229, 240, 0.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, height - padding.bottom);
  context.lineTo(width - padding.right, height - padding.bottom);
  context.stroke();

  flows.forEach((flow, index) => {
    const x = padding.left + (chartWidth / flows.length) * index + (chartWidth / flows.length - barWidth) / 2;
    const barHeight = Math.max(2, (flow.cashFlow / maxFlow) * chartHeight);
    const y = height - padding.bottom - barHeight;
    const gradient = context.createLinearGradient(0, y, 0, height - padding.bottom);
    gradient.addColorStop(0, "#6aa7ff");
    gradient.addColorStop(1, "#72d05f");

    context.fillStyle = gradient;
    roundedRect(context, x, y, barWidth, barHeight, 6);
    context.fill();

    context.fillStyle = "#b8c0ca";
    context.font = `12px ${CHART_FONT_STACK}`;
    context.textAlign = "center";
    context.fillText(`Y${flow.year}`, x + barWidth / 2, height - 18);
  });

  context.fillStyle = "#f8fbff";
  context.font = `13px ${CHART_FONT_STACK}`;
  context.textAlign = "left";
  context.fillText(calc.model.chartTitle, padding.left, 18);
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
