const STORAGE_KEY = "intrinsic-value-omxs30-v1";
const MARKET_DATA_URL = "data/omxs30-data.json";
const companyCategoryDefinitions = {
  operating: {
    label: "Operating company",
    shortLabel: "Operating",
    model: "DCF + reverse DCF + P/E",
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
    model: "Normalized earnings/FCF",
    warning: "Use normalized mid-cycle earnings or FCF, not one-year FCF."
  }
};

const categoryTickers = {
  bank: new Set(["SHB-A.ST", "NDA-SE.ST", "SEB-A.ST", "SWED-A.ST"]),
  investment: new Set(["EQT.ST", "INDU-C.ST", "INVE-B.ST"]),
  cyclical: new Set(["BOL.ST", "SCA-B.ST", "SKA-B.ST", "SKF-B.ST", "SAND.ST", "VOLV-B.ST"])
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
    loaded: false,
    status: "Sample inputs",
    generatedAt: null,
    provider: null,
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
  selectedName: document.querySelector("#selectedName"),
  selectedMeta: document.querySelector("#selectedMeta"),
  inputBadge: document.querySelector("#inputBadge"),
  stanceBadge: document.querySelector("#stanceBadge"),
  valuationSubtitle: document.querySelector("#valuationSubtitle"),
  metricValue: document.querySelector("#metricValue"),
  metricValueSub: document.querySelector("#metricValueSub"),
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
  portfolioSummary: document.querySelector("#portfolioSummary"),
  sectorBars: document.querySelector("#sectorBars"),
  dcfChart: document.querySelector("#dcfChart"),
  dataStatus: document.querySelector("#dataStatus"),
  dataTimestamp: document.querySelector("#dataTimestamp"),
  reloadDataBtn: document.querySelector("#reloadDataBtn"),
  syntheticPortfolio: document.querySelector("#syntheticPortfolio"),
  syntheticSummary: document.querySelector("#syntheticSummary"),
  syntheticCount: document.querySelector("#syntheticCount"),
  fundamentalsSubtitle: document.querySelector("#fundamentalsSubtitle"),
  fundMarketCap: document.querySelector("#fundMarketCap"),
  fundRevenue: document.querySelector("#fundRevenue"),
  fundEquity: document.querySelector("#fundEquity"),
  fundLiabilities: document.querySelector("#fundLiabilities"),
  fundDebt: document.querySelector("#fundDebt"),
  fundCash: document.querySelector("#fundCash"),
  fundShares: document.querySelector("#fundShares"),
  fundFcfYield: document.querySelector("#fundFcfYield"),
  footerDataNote: document.querySelector("#footerDataNote"),
  exportBtn: document.querySelector("#exportBtn"),
  importFile: document.querySelector("#importFile"),
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
    const debt = sector === "Financials" ? 0 : round(((index % 7) - 3) * 1.65, 2);
    const [industryScore, companyScore, leadershipScore] = defaults.quality;
    const bookValuePerShare = category === "bank"
      ? round(price / 1.15, 2)
      : (category === "investment" ? round(price * 1.12, 2) : round(price * 0.42, 2));
    const roe = category === "bank"
      ? round(12.5 + (index % 4) * 0.6, 1)
      : round((eps / Math.max(bookValuePerShare, 1)) * 100, 1);
    const normalizedFcfPerShare = category === "cyclical" ? round(fcfPerShare * 1.12, 2) : fcfPerShare;

    return {
      id: ticker.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      ticker,
      name,
      sector,
      companyType: category,
      marketPrice: price,
      fcfPerShare,
      eps,
      netDebtPerShare: debt,
      bookValuePerShare,
      roe,
      normalizedFcfPerShare,
      growth5y: round(defaults.growth5y + ((index % 5) - 2) * 0.35, 1),
      consensusGrowth: round(defaults.consensusGrowth + ((index % 4) - 1) * 0.25, 1),
      wacc: round(defaults.wacc + ((index % 3) - 1) * 0.25, 1),
      terminalGrowth: defaults.terminalGrowth,
      targetPe: round(defaults.targetPe + ((index % 3) - 1) * 0.6, 1),
      portfolioWeight: 0,
      industryScore,
      companyScore: clamp(companyScore + ((index % 3) - 1), 1, 5),
      leadershipScore: clamp(leadershipScore + ((index % 4) === 0 ? 1 : 0), 1, 5),
      notes: "",
      source: "Sample input",
      currency: "SEK",
      dataUpdatedAt: null,
      fundamentals: {}
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
  try {
    const response = await fetch(`${MARKET_DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload?.companies)) throw new Error("Missing companies");

    state.companies = applyMarketData(state.companies, payload.companies);
    state.marketData = {
      loaded: true,
      status: "Yahoo Finance",
      generatedAt: payload.generatedAt ?? null,
      provider: payload.provider ?? "Yahoo Finance via yfinance",
      errors: payload.companies.flatMap((company) => company.errors ?? [])
    };
    saveCompanies();
    renderAll();
    if (!quiet) showToast("Market data reloaded");
  } catch (error) {
    state.marketData = {
      loaded: false,
      status: "Sample or saved inputs",
      generatedAt: null,
      provider: null,
      errors: [String(error?.message ?? error)]
    };
    renderDataStatus();
    if (!quiet) showToast("No market data file found");
  }
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
      netIncome: numberOrNull(market.netIncome),
      operatingCashFlow: numberOrNull(market.operatingCashFlow),
      capitalExpenditures: numberOrNull(market.capitalExpenditures),
      freeCashFlow: numberOrNull(market.freeCashFlow),
      totalAssets: numberOrNull(market.totalAssets),
      totalLiabilities: numberOrNull(market.totalLiabilities),
      bookEquity: numberOrNull(market.bookEquity),
      totalDebt: numberOrNull(market.totalDebt),
      cash: numberOrNull(market.cash),
      equityPerShare: numberOrNull(market.equityPerShare),
      liabilitiesPerShare: numberOrNull(market.liabilitiesPerShare),
      trailingPe: numberOrNull(market.trailingPe),
      forwardPe: numberOrNull(market.forwardPe),
      analystTargetMeanPrice: numberOrNull(market.analystTargetMeanPrice),
      recommendationMean: numberOrNull(market.recommendationMean),
      roe: numberOrNull(market.roe),
      normalizedFcfPerShare: numberOrNull(market.normalizedFcfPerShare),
      financialCurrency: market.financialCurrency ?? null,
      financialToQuoteFx: numberOrNull(market.financialToQuoteFx),
      errors: market.errors ?? []
    };

    const marketBookValue = market.bookValuePerShare ?? market.equityPerShare;

    return {
      ...seedCompany,
      ...current,
      companyType: normalizeCompanyType(market.companyType ?? current.companyType, seedCompany.ticker),
      marketPrice: numberOrFallback(market.marketPrice, current.marketPrice ?? seedCompany.marketPrice),
      fcfPerShare: numberOrFallback(market.fcfPerShare, current.fcfPerShare ?? seedCompany.fcfPerShare),
      eps: numberOrFallback(market.eps, current.eps ?? seedCompany.eps),
      netDebtPerShare: numberOrFallback(market.netDebtPerShare, current.netDebtPerShare ?? seedCompany.netDebtPerShare),
      bookValuePerShare: numberOrFallback(marketBookValue, current.bookValuePerShare ?? seedCompany.bookValuePerShare),
      roe: numberOrFallback(market.roe, current.roe ?? seedCompany.roe),
      normalizedFcfPerShare: numberOrFallback(market.normalizedFcfPerShare, current.normalizedFcfPerShare ?? seedCompany.normalizedFcfPerShare),
      growth5y: numberOrFallback(market.growth5y, current.growth5y ?? seedCompany.growth5y),
      consensusGrowth: numberOrFallback(market.consensusGrowth, current.consensusGrowth ?? seedCompany.consensusGrowth),
      targetPe: numberOrFallback(market.targetPe, current.targetPe ?? seedCompany.targetPe),
      currency: market.currency ?? current.currency ?? "SEK",
      dataUpdatedAt: market.dataUpdatedAt ?? current.dataUpdatedAt ?? null,
      source: market.source ? "Yahoo Finance + manual assumptions" : (current.source ?? seedCompany.source),
      notes: current.notes ?? seedCompany.notes,
      wacc: current.wacc ?? seedCompany.wacc,
      terminalGrowth: current.terminalGrowth ?? seedCompany.terminalGrowth,
      portfolioWeight: current.portfolioWeight ?? seedCompany.portfolioWeight,
      industryScore: current.industryScore ?? seedCompany.industryScore,
      companyScore: current.companyScore ?? seedCompany.companyScore,
      leadershipScore: current.leadershipScore ?? seedCompany.leadershipScore,
      fundamentals
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
  const currentPe = asNumber(company.eps) > 0 ? asNumber(company.marketPrice) / asNumber(company.eps) : NaN;
  const reverse = calculateReverseDcf(company);
  const reverseBurdenScore = Number.isFinite(reverse.value)
    ? clamp(100 - Math.max(0, reverse.value - asNumber(company.consensusGrowth)) * 7, 0, 100)
    : 50;

  return {
    dcf,
    peValue,
    currentPe,
    blendedValue: averageValid([dcf.value, peValue]),
    primaryLabel: "DCF value",
    primaryValue: dcf.value,
    secondaryLabel: "P/E value",
    secondaryValue: peValue,
    tertiaryLabel: "Current P/E",
    tertiaryValue: Number.isFinite(currentPe) ? `${formatDecimal(currentPe, 1)}x` : "-",
    reverseLabel: "Reverse DCF",
    reverseValue: reverse.label,
    reverseSub: `Consensus ${formatPercent(asNumber(company.consensusGrowth), 1)}`,
    valueDescription: Number.isFinite(dcf.value) || Number.isFinite(peValue)
      ? `${formatCurrency(dcf.value, company.currency ?? "SEK")} DCF | ${formatCurrency(peValue, company.currency ?? "SEK")} P/E`
      : "Needs FCF or EPS inputs",
    modelSupportScore: reverseBurdenScore,
    modelWarning: "",
    chartTitle: "Projected FCF / share"
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
  const peValue = calculatePeValue(company, scenario);
  const currentPe = asNumber(company.eps) > 0 ? price / asNumber(company.eps) : NaN;
  const normalizedFcfYield = price > 0 && normalizedFcf && normalizedFcf > 0 ? (normalizedFcf / price) * 100 : NaN;

  return {
    dcf: { value: NaN, flows: [], error: "" },
    peValue,
    currentPe,
    blendedValue: weightedAverage([
      { value: normalizedFcfValue, weight: 0.7 },
      { value: peValue, weight: 0.3 }
    ]),
    primaryLabel: "Norm. FCF value",
    primaryValue: normalizedFcfValue,
    secondaryLabel: "P/E value",
    secondaryValue: peValue,
    tertiaryLabel: "Norm. FCF yield",
    tertiaryValue: formatPercent(normalizedFcfYield, 1),
    reverseLabel: "Norm. FCF yield",
    reverseValue: formatPercent(normalizedFcfYield, 1),
    reverseSub: "Mid-cycle cash flow yield",
    valueDescription: Number.isFinite(normalizedFcfValue)
      ? `${formatDecimal(normalizedMultiple, 1)}x normalized FCF | ${formatCurrency(peValue, currency)} P/E`
      : "Needs normalized FCF per share",
    modelSupportScore: Number.isFinite(normalizedFcfYield) ? clamp(45 + normalizedFcfYield * 5, 0, 100) : 50,
    modelWarning: Number.isFinite(normalizedFcfValue) ? "" : "Add normalized FCF per share for the cyclical model.",
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

  elements.reloadDataBtn.addEventListener("click", () => loadMarketData({ quiet: false }));
  elements.exportBtn.addEventListener("click", exportData);
  elements.importFile.addEventListener("change", importData);

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
  renderSectorBars();
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
  elements.selectedTicker.textContent = company.ticker;
  elements.selectedName.textContent = company.name;
  elements.selectedMeta.textContent = `${company.sector} | ${getCompanyTypeLabel(category)} | ${company.source}`;
  elements.inputBadge.textContent = category !== "operating"
    ? getCompanyModelLabel(category)
    : (company.source.includes("Yahoo") ? "Yahoo data loaded" : (company.source === "Edited" ? "Edited inputs" : "Sample inputs"));
  elements.stanceBadge.textContent = calc.stance.label;
  elements.stanceBadge.className = `status-badge ${calc.stance.key}`;
  elements.valuationSubtitle.textContent = `${scenarioAdjustments[state.scenario].label} | ${getCompanyModelLabel(category)}`;
}

function renderDataStatus() {
  const generatedAt = state.marketData.generatedAt ? new Date(state.marketData.generatedAt) : null;
  const timestamp = generatedAt && !Number.isNaN(generatedAt.valueOf())
    ? generatedAt.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })
    : "Run the updater to load Yahoo data";

  elements.dataStatus.textContent = state.marketData.status;
  elements.dataTimestamp.textContent = timestamp;
  elements.footerDataNote.textContent = state.marketData.loaded
    ? `Market data: ${state.marketData.provider}, ${timestamp}.`
    : "OMXS30 seed composition: 2025-07-01.";
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
      <button class="company-row ${company.id === state.selectedId ? "is-active" : ""}" type="button" data-company-id="${company.id}">
          <span class="company-main">
            <span class="company-name">${escapeHtml(company.name)}</span>
          <span class="company-ticker">${escapeHtml(company.ticker)} | ${escapeHtml(company.sector)} | ${escapeHtml(getCompanyTypeShortLabel(normalizeCompanyType(company.companyType, company.ticker)))}</span>
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
  elements.metricMos.textContent = formatPercent(calc.marginOfSafety, 1);
  elements.metricMos.className = calc.marginOfSafety >= 0 ? "is-positive" : "is-negative";
  elements.metricMosSub.textContent = `Price ${formatCurrency(asNumber(company.marketPrice), company.currency ?? "SEK")}`;
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
  elements.portfolioSummary.textContent = `${calc.stance.label} | ${formatDecimal(asNumber(company.portfolioWeight), 1)}% position`;

  document.querySelectorAll("[data-score-value]").forEach((label) => {
    const field = label.dataset.scoreValue;
    label.textContent = `${company[field] ?? 3}/5`;
  });
}

function renderSectorBars() {
  const sectors = new Map();
  state.companies.forEach((company) => {
    const calc = calculateCompany(company, "base");
    if (!sectors.has(company.sector)) sectors.set(company.sector, []);
    sectors.get(company.sector).push(calc.marginOfSafety);
  });

  const sectorRows = [...sectors.entries()]
    .map(([sector, values]) => {
      const valid = values.filter(Number.isFinite);
      const average = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
      return { sector, average };
    })
    .sort((left, right) => right.average - left.average)
    .slice(0, 6);

  elements.sectorBars.innerHTML = sectorRows.map(({ sector, average }) => {
    const width = clamp(Math.abs(average), 2, 55);
    const cls = average >= 0 ? "positive" : "negative";
    return `
      <div class="bar-row">
        <header>
          <span>${escapeHtml(sector)}</span>
          <strong class="${average >= 0 ? "is-positive" : "is-negative"}">${formatPercent(average, 0)}</strong>
        </header>
        <div class="bar-track">
          <div class="bar-fill ${cls}" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
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
  const fcfYield = asNumber(company.marketPrice) > 0 && asNumber(company.fcfPerShare) > 0
    ? (asNumber(company.fcfPerShare) / asNumber(company.marketPrice)) * 100
    : NaN;
  const updatedAt = company.dataUpdatedAt ? new Date(company.dataUpdatedAt) : null;
  const updatedText = updatedAt && !Number.isNaN(updatedAt.valueOf())
    ? updatedAt.toLocaleDateString("sv-SE")
    : "No Yahoo data loaded";

  elements.fundamentalsSubtitle.textContent = `${company.source} | ${updatedText}`;
  elements.fundMarketCap.textContent = formatCurrency(numberOrNull(fundamentals.marketCap), currency);
  elements.fundRevenue.textContent = formatCurrency(numberOrNull(fundamentals.totalRevenue), currency);
  elements.fundEquity.textContent = formatCurrency(numberOrNull(fundamentals.bookEquity), currency);
  elements.fundLiabilities.textContent = formatCurrency(numberOrNull(fundamentals.totalLiabilities), currency);
  elements.fundDebt.textContent = formatCurrency(numberOrNull(fundamentals.totalDebt), currency);
  elements.fundCash.textContent = formatCurrency(numberOrNull(fundamentals.cash), currency);
  elements.fundShares.textContent = formatShares(numberOrNull(fundamentals.sharesOutstanding));
  elements.fundFcfYield.textContent = formatPercent(fcfYield, 1);
  elements.fundFcfYield.className = fcfYield >= 0 ? "is-positive" : "is-negative";
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
  context.fillStyle = "#fbfcfb";
  context.fillRect(0, 0, width, height);

  if (category !== "operating") {
    context.fillStyle = "#17201b";
    context.font = "14px Inter, sans-serif";
    context.fillText(calc.model.chartTitle, 22, 34);
    context.fillStyle = "#66706b";
    context.fillText(calc.model.valueDescription, 22, 62);
    context.fillText(`${calc.model.primaryLabel}: ${formatCurrency(calc.model.primaryValue, company.currency ?? "SEK")}`, 22, 92);
    context.fillText(`${calc.model.secondaryLabel}: ${formatCurrency(calc.model.secondaryValue, company.currency ?? "SEK")}`, 22, 120);
    return;
  }

  if (!flows.length) {
    context.fillStyle = "#66706b";
    context.font = "14px Inter, sans-serif";
    context.fillText("DCF input conflict", 22, 34);
    return;
  }

  const padding = { top: 26, right: 22, bottom: 42, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxFlow = Math.max(...flows.map((flow) => flow.cashFlow), asNumber(company.fcfPerShare));
  const barWidth = Math.min(58, chartWidth / flows.length * 0.54);

  context.strokeStyle = "#dbe3dc";
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
    gradient.addColorStop(0, "#3267c8");
    gradient.addColorStop(1, "#1f7a5a");

    context.fillStyle = gradient;
    roundedRect(context, x, y, barWidth, barHeight, 6);
    context.fill();

    context.fillStyle = "#66706b";
    context.font = "12px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText(`Y${flow.year}`, x + barWidth / 2, height - 18);
  });

  context.fillStyle = "#17201b";
  context.font = "13px Inter, sans-serif";
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
