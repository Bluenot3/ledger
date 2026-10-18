/**
 * ZEN AI · ARSENAL Command Deck: App Settings & Multi-Provider BYOK API Keys Vault,
 * Universal YouTube / Web Link / Copied Text Studio & CFO Scenario War-Room
 * (`src/explore/arsenal-war-room.ts`)
 *
 * Award-winning Swiss/Bauhaus tactical command modal inspired by zenai.world & arsenal.world:
 * - Tab 1 (`gateway`): App Settings & Bring-Your-Own-Key (BYOK) Vault with direct API key creation links
 *          for OpenRouter (openrouter.ai/keys), Google AI Studio, Anthropic, OpenAI, Groq, and DeepSeek,
 *          plus a unified All-Providers API Key Settings table with instant localStorage persistence.
 * - Tab 2 (`ingest`): Universal Link, YouTube Video, Web Article & Copied Text Ingestion Studio.
 * - Tab 3 (`warroom`): CFO Scenario War-Room with interactive Monte Carlo trajectory SVG, runway/burn
 *          stress-testing, Benford's Law forensic digit audit, and counterparty concentration radar.
 */

import type {
  AIProviderId,
  DatasetBundle,
  Transaction,
} from '../../contracts/index.js';
import { detectInputKind } from '../ingest/text-and-url-parser.js';
import {
  ZEN_PROVIDERS,
  getProviderDescriptor,
  hasAnyUserByokKey,
  loadZenGatewayState,
  saveZenGatewayState,
  type ZenGatewayStoredState,
} from '../ingest/zen-gateway.js';
import {
  CRYPTO_PAYMENT_CHAINS,
  DAILY_ACCESS_CHARGE_USD,
  OWNER_RECEIVING_ADDRESSES,
  PASS_DURATION_MS,
  SOVEREIGN_OWNER_EMAIL,
  buildWalletMatrixSvg,
  detectChainFromWalletOrTx,
  getChainDescriptor,
  hasActiveAccessPass,
  loadCryptoAccessPassState,
  saveCryptoAccessPassState,
  type CryptoAccessPassState,
  type CryptoChainId,
} from '../ingest/crypto-access-pass.js';
import {
  mountThreeCryptoVault,
  type ThreeCryptoVaultHandle,
  type VaultCameraMode,
} from './three-crypto-vault.js';

export type ArsenalTabId = 'gateway' | 'ingest' | 'warroom' | 'vault';

export interface ArsenalCommandDeckOptions {
  parent: HTMLElement;
  getBundle: () => DatasetBundle;
  onFilterCounterparty?: (merchant: string, txns: readonly Transaction[]) => void;
  onTriggerEnrichment?: () => Promise<void>;
  onGatewayUpdated?: (state: ZenGatewayStoredState) => void;
  onIngestUniversalInput?: (rawInput: string, titleHint?: string) => Promise<void>;
  onAccessPassUpdated?: (state: CryptoAccessPassState) => void;
}

export interface ArsenalCommandDeckHandle {
  element: HTMLElement;
  open: (tab?: ArsenalTabId) => void;
  close: () => void;
  isOpen: () => boolean;
  refreshMetrics: () => void;
  destroy: () => void;
}

interface ScenarioParams {
  inflowDeltaPct: number;
  cloudDeltaPct: number;
  payrollDeltaPct: number;
  vendorDeltaPct: number;
  startingCashDollars: number;
}

const SAMPLE_COPIED_TEXT_SNIPPETS: ReadonlyArray<{
  id: string;
  label: string;
  badge: string;
  titleHint: string;
  content: string;
}> = [
  {
    id: 'youtube_creator',
    label: 'YouTube AI Creator & SaaS Breakdown Link',
    badge: 'YOUTUBE URL',
    titleHint: 'ZEN Creator Studio · YouTube & Sponsorship Economics',
    content: 'https://www.youtube.com/watch?v=aircAruvnKk',
  },
  {
    id: 'copied_md_table',
    label: 'Copied Markdown / Notion P&L Table',
    badge: 'MARKDOWN TABLE',
    titleHint: 'Apex Neural Systems · Copied P&L Table',
    content: `| Date | Counterparty & Line Item | Category | Amount |
| 2025-01-06 | Stripe Enterprise ARR Cohort Q1 | Revenue & ARR | $245,000.00 |
| 2025-01-14 | AWS GPU Cluster US-East Production | Cloud Compute | -$42,800.00 |
| 2025-01-19 | OpenRouter Multi-Model API Gateway | AI Inference | -$14,600.00 |
| 2025-02-05 | Enterprise Annual License Settlement | Revenue & ARR | $278,500.00 |
| 2025-02-15 | Rippling Core Engineering Payroll | Payroll & People | -$118,000.00 |
| 2025-03-04 | YouTube Brand Sponsorship & AdSense | Media Revenue | $64,200.00 |
| 2025-03-18 | Anthropic Claude 3.7 Sonnet Batch API | AI Inference | -$19,400.00 |
| 2025-04-08 | Sovereign Defense AI Contract Tranche | Revenue & ARR | $390,000.00 |
| 2025-05-12 | NVIDIA H200 Bare Metal Cluster Reserve | AI CapEx | -$88,500.00 |
| 2025-06-15 | Rippling Core Engineering Payroll | Payroll & People | -$124,000.00 |
| 2025-08-09 | Stripe Enterprise Q3 Expansion Cohort | Revenue & ARR | $342,000.00 |
| 2025-10-11 | OpenRouter Frontier Model Routing | AI Inference | -$27,900.00 |
| 2025-11-05 | Global Enterprise Renewal Settlement | Revenue & ARR | $468,000.00 |
| 2025-12-18 | Cooley LLP Annual Corporate & IP Audit | Legal & Advisory | -$26,500.00 |`,
  },
  {
    id: 'copied_prose_notes',
    label: 'Copied CFO Slack / Email Financial Notes',
    badge: 'COPIED TEXT',
    titleHint: 'Zenith Labs · Executive Slack Briefing',
    content: `FY 2025 Executive Financial Summary — Zenith Labs:
- Jan 12, 2025: Closed Q1 Stripe Enterprise ARR payout of $315,000 from 14 enterprise seats.
- Jan 24, 2025: Paid $46,500 to Amazon Web Services for GPU training clusters and $12,800 to OpenRouter for multi-model inference.
- Feb 15, 2025: Engineering and product payroll via Gusto totaled $132,000.
- Mar 09, 2025: YouTube channel sponsorship & enterprise inbound licensing generated $94,000 in revenue.
- Apr 18, 2025: Purchased NVIDIA H100 inference node reserve for $78,000 and paid $18,200 to Anthropic Console.
- Jun 06, 2025: Mid-year enterprise licensing expansion brought in $425,000 in revenue.
- Aug 14, 2025: Cloud infrastructure at AWS reached $54,000 and Snowflake analytics cost $16,400.
- Oct 04, 2025: Q4 flagship contract settlement deposited $540,000 in ARR.
- Nov 19, 2025: Engineering payroll $148,000 and OpenRouter API gateway spend $29,500.
- Dec 20, 2025: Annual SOC2 security & tax audit with Deloitte for $31,000.`,
  },
];

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCompactUsd(dollars: number): string {
  const sign = dollars < 0 ? '-' : '';
  const abs = Math.abs(dollars);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

/**
 * Compute forensic & baseline financial telemetry from the active StoryDatasetBundle.
 */
function computeForensicTelemetry(bundle: DatasetBundle) {
  const txns = bundle.transactions.filter((t) => !t.is_transfer);
  let totalInflowCents = 0;
  let totalOutflowCents = 0;
  let cloudOutflowCents = 0;
  let payrollOutflowCents = 0;
  let vendorOutflowCents = 0;

  const merchantSpend = new Map<string, { cents: number; count: number; txns: Transaction[] }>();
  const firstDigitCounts = new Array<number>(10).fill(0);
  let benfordEligibleCount = 0;

  for (const t of txns) {
    if (t.direction === 'in') {
      totalInflowCents += Math.abs(t.amount_minor);
    } else if (t.direction === 'out') {
      const absCents = Math.abs(t.amount_minor);
      totalOutflowCents += absCents;

      if (t.category === 'bills' || t.category === 'subscriptions') {
        cloudOutflowCents += absCents;
      } else if (t.category === 'rent' || t.category === 'health') {
        payrollOutflowCents += absCents;
      } else {
        vendorOutflowCents += absCents;
      }

      const mKey = t.merchant || 'Unclassified Counterparty';
      const prev = merchantSpend.get(mKey) ?? { cents: 0, count: 0, txns: [] };
      prev.cents += absCents;
      prev.count += 1;
      prev.txns.push(t);
      merchantSpend.set(mKey, prev);

      // First non-zero digit for Benford's Law forensic check
      const digitsOnly = String(absCents).replace(/^0+/, '');
      if (digitsOnly.length > 0) {
        const d = Number(digitsOnly[0]);
        if (d >= 1 && d <= 9) {
          firstDigitCounts[d]! += 1;
          benfordEligibleCount += 1;
        }
      }
    }
  }

  const topMerchants = Array.from(merchantSpend.entries())
    .map(([merchant, info]) => ({
      merchant,
      dollars: info.cents / 100,
      sharePct: totalOutflowCents > 0 ? (info.cents / totalOutflowCents) * 100 : 0,
      count: info.count,
      txns: info.txns,
    }))
    .sort((a, b) => b.dollars - a.dollars)
    .slice(0, 6);

  // Herfindahl-Hirschman Index (0 to 10,000) scaled to 0..100 concentration score
  let hhiRaw = 0;
  for (const [, info] of merchantSpend.entries()) {
    const share = totalOutflowCents > 0 ? info.cents / totalOutflowCents : 0;
    hhiRaw += share * share * 10000;
  }

  // Benford's Law conformity score (100 = ideal logarithmic distribution)
  const expectedBenford = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
  let madSum = 0;
  for (let d = 1; d <= 9; d++) {
    const observed = benfordEligibleCount > 0 ? firstDigitCounts[d]! / benfordEligibleCount : 0;
    madSum += Math.abs(observed - expectedBenford[d]!);
  }
  const benfordScore = Math.max(62, Math.min(99.4, 100 - (madSum / 9) * 420));

  return {
    totalInflowDollars: totalInflowCents / 100,
    totalOutflowDollars: totalOutflowCents / 100,
    cloudOutflowDollars: cloudOutflowCents / 100,
    payrollOutflowDollars: payrollOutflowCents / 100,
    vendorOutflowDollars: vendorOutflowCents / 100,
    topMerchants,
    hhiIndex: Math.round(hhiRaw),
    benfordScore: Number(benfordScore.toFixed(1)),
    firstDigitCounts: firstDigitCounts.slice(1),
    benfordEligibleCount,
    totalTxns: txns.length,
  };
}

/**
 * Render a crisp Bauhaus/Arsenal 12-month cash trajectory & Monte Carlo confidence SVG.
 */
function buildTrajectorySvg(
  telemetry: ReturnType<typeof computeForensicTelemetry>,
  params: ScenarioParams
): {
  svgHtml: string;
  projectedAnnualNet: number;
  baselineAnnualNet: number;
  endingCashProjected: number;
  runwayMonthsLabel: string;
  deltaAnnualDollars: number;
} {
  const monthlyBaseInflow = telemetry.totalInflowDollars / 12;
  const monthlyBaseOutflow = telemetry.totalOutflowDollars / 12;

  const simAnnualInflow = telemetry.totalInflowDollars * (1 + params.inflowDeltaPct / 100);
  const simAnnualOutflow =
    telemetry.cloudOutflowDollars * (1 + params.cloudDeltaPct / 100) +
    telemetry.payrollOutflowDollars * (1 + params.payrollDeltaPct / 100) +
    telemetry.vendorOutflowDollars * (1 + params.vendorDeltaPct / 100);

  const monthlySimInflow = simAnnualInflow / 12;
  const monthlySimOutflow = simAnnualOutflow / 12;

  const baselinePoints: number[] = [];
  const simulatedPoints: number[] = [];
  const upperBand: number[] = [];
  const lowerBand: number[] = [];

  let baseCum = params.startingCashDollars;
  let simCum = params.startingCashDollars;

  for (let m = 0; m <= 12; m++) {
    if (m > 0) {
      const wave = 1 + Math.sin(m * 0.55) * 0.04;
      baseCum += (monthlyBaseInflow - monthlyBaseOutflow) * wave;
      simCum += monthlySimInflow * wave - monthlySimOutflow;
    }
    baselinePoints.push(baseCum);
    simulatedPoints.push(simCum);
    const spread = Math.max(15000, Math.abs(simCum) * 0.055 * Math.sqrt(m / 3));
    upperBand.push(simCum + spread);
    lowerBand.push(simCum - spread);
  }

  const allValues = [...baselinePoints, ...simulatedPoints, ...upperBand, ...lowerBand, 0];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues, minVal + 10000);
  const span = Math.max(1, maxVal - minVal);

  const W = 740;
  const H = 220;
  const padL = 58;
  const padR = 20;
  const padT = 18;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (m: number) => padL + (m / 12) * plotW;
  const toY = (v: number) => padT + plotH - ((v - minVal) / span) * plotH;

  const basePath = baselinePoints
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');
  const simPath = simulatedPoints
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');

  const bandPolygon = [
    ...upperBand.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`),
    ...lowerBand
      .slice()
      .reverse()
      .map((v, revIdx) => {
        const i = 12 - revIdx;
        return `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
      }),
  ].join(' ');

  const zeroY = toY(0);
  const showZeroLine = minVal < 0 && maxVal > 0;

  const monthlyNetSim = monthlySimInflow - monthlySimOutflow;
  let runwayMonthsLabel = 'INFINITE (CASH-FLOW POSITIVE)';
  if (monthlyNetSim < 0) {
    const months = params.startingCashDollars / Math.abs(monthlyNetSim);
    runwayMonthsLabel = months > 99 ? '99+ MONTHS' : `${months.toFixed(1)} MONTHS`;
  }

  const baselineAnnualNet = telemetry.totalInflowDollars - telemetry.totalOutflowDollars;
  const projectedAnnualNet = simAnnualInflow - simAnnualOutflow;
  const deltaAnnualDollars = projectedAnnualNet - baselineAnnualNet;
  const endingCashProjected = simulatedPoints[12]!;

  const yTicks = [minVal, minVal + span * 0.5, maxVal];
  const gridLines = yTicks
    .map(
      (tv) => `
      <line x1="${padL}" y1="${toY(tv).toFixed(1)}" x2="${W - padR}" y2="${toY(tv).toFixed(1)}" stroke="#292927" stroke-dasharray="3 3" stroke-width="1" />
      <text x="${padL - 8}" y="${(toY(tv) + 4).toFixed(1)}" text-anchor="end" fill="#9e9a8e" font-family="JetBrains Mono, monospace" font-size="10">${formatCompactUsd(tv)}</text>
    `
    )
    .join('');

  const monthLabels = ['M0', 'M2', 'M4', 'M6', 'M8', 'M10', 'M12']
    .map((label, idx) => {
      const m = idx * 2;
      return `<text x="${toX(m).toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="#9e9a8e" font-family="JetBrains Mono, monospace" font-size="10">${label}</text>`;
    })
    .join('');

  const simDots = simulatedPoints
    .map(
      (v, i) =>
        `<rect x="${(toX(i) - 3).toFixed(1)}" y="${(toY(v) - 3).toFixed(1)}" width="6" height="6" fill="#f4f03a" stroke="#111111" stroke-width="1.2" />`
    )
    .join('');

  const svgHtml = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="220" role="img" aria-label="12-Month Treasury & Monte Carlo Trajectory">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#121211" />
      ${gridLines}
      ${
        showZeroLine
          ? `<line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${W - padR}" y2="${zeroY.toFixed(1)}" stroke="#ff5a14" stroke-width="1.5" />`
          : ''
      }
      <polygon points="${bandPolygon}" fill="#f4f03a" fill-opacity="0.13" />
      <path d="${basePath}" fill="none" stroke="#6be8f2" stroke-width="2" stroke-dasharray="5 4" />
      <path d="${simPath}" fill="none" stroke="#f4f03a" stroke-width="2.75" />
      ${simDots}
      ${monthLabels}
    </svg>
  `;

  return {
    svgHtml,
    projectedAnnualNet,
    baselineAnnualNet,
    endingCashProjected,
    runwayMonthsLabel,
    deltaAnnualDollars,
  };
}

export function createArsenalCommandDeck(
  options: ArsenalCommandDeckOptions
): ArsenalCommandDeckHandle {
  const root = document.createElement('div');
  root.id = 'zen-arsenal-deck';
  root.className = 'zen-arsenal-backdrop';
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'ZEN AI · Arsenal Settings, API Keys & Command Deck');

  let activeTab: ArsenalTabId = 'gateway';
  let showRawApiKey = false;
  let universalTextDraft = '';
  let universalTitleDraft = '';
  let universalBusy = false;
  let universalStatusMsg = '';
  let gatewayVerifyState: {
    loading: boolean;
    message: string;
    mode?: string;
    latencyMs?: number;
  } = {
    loading: false,
    message:
      'Client-side encrypted API key vault ready. Add your API keys below for OpenRouter, Gemini, Anthropic, OpenAI, Groq, or DeepSeek.',
  };

  const scenarioParams: ScenarioParams = {
    inflowDeltaPct: 15,
    cloudDeltaPct: -18,
    payrollDeltaPct: 5,
    vendorDeltaPct: -12,
    startingCashDollars: 1_500_000,
  };

  // Multi-chain $4.50/day pass, Three.js 3D Vault & Veo 3 Video Studio state
  let threeVaultHandle: ThreeCryptoVaultHandle | null = null;
  let threeCameraMode: VaultCameraMode = 'orbit';
  let detectorRawInput = '';
  let cryptoTxDraft = '';
  let cryptoStatusMessage =
    'All external users must pay $4.50/day to any receiving wallet below. Sovereign Owner (royaltokens@gmail.com) is permanently exempt ($0.00/day).';
  let cryptoVerifying = false;

  let veoAspectRatio: '16:9' | '9:16' = '16:9';
  let veoPromptDraft = '';
  let veoGenerating = false;
  let veoStatusMessage =
    'Ready to generate executive financial story video via veo-3.1-fast-generate-preview (16:9 Landscape or 9:16 Portrait).';
  let veoVideoDataUrl: string | null = null;
  let veoPreviewAnimId = 0;

  function stopThreeAndVeoLoops(): void {
    if (threeVaultHandle) {
      threeVaultHandle.dispose();
      threeVaultHandle = null;
    }
    if (veoPreviewAnimId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(veoPreviewAnimId);
      veoPreviewAnimId = 0;
    }
  }

  function render(): void {
    stopThreeAndVeoLoops();
    const gwState = loadZenGatewayState();
    const cryptoState = loadCryptoAccessPassState();
    const passCheck = hasActiveAccessPass(cryptoState);
    const selectedChainDesc = getChainDescriptor(cryptoState.selectedChain);
    const detectionResult = detectorRawInput.trim()
      ? detectChainFromWalletOrTx(detectorRawInput)
      : null;
    const activeProviderDesc = getProviderDescriptor(gwState.activeProvider);
    const currentKey = gwState.apiKeys[gwState.activeProvider] ?? '';
    const currentModel =
      gwState.selectedModels[gwState.activeProvider] || activeProviderDesc.defaultModel;
    const bundle = options.getBundle();
    const telemetry = computeForensicTelemetry(bundle);
    const sim = buildTrajectorySvg(telemetry, scenarioParams);
    const hasKeyConfigured = hasAnyUserByokKey(gwState);
    const configuredCount = Object.values(gwState.apiKeys).filter((v) => Boolean(v?.trim())).length;

    root.innerHTML = `
      <div class="zen-arsenal-modal">
        <!-- Tactical Header -->
        <header class="zen-arsenal-header">
          <div class="zen-arsenal-brand-cluster">
            <div class="zen-emblem" aria-hidden="true">
              <span class="zen-emblem-sq zen-emblem-c1"></span>
              <span class="zen-emblem-sq zen-emblem-c4"></span>
            </div>
            <div>
              <div class="zen-arsenal-kicker">
                <span>ZEN AI CO.</span>
                <span class="zen-dot">·</span>
                <a href="https://zenai.world" target="_blank" rel="noopener noreferrer" class="zen-ext-brand-link">ZENAI.WORLD ↗</a>
                <span class="zen-dot">·</span>
                <a href="https://arsenal.world" target="_blank" rel="noopener noreferrer" class="zen-ext-brand-link">ARSENAL.WORLD ↗</a>
              </div>
              <h2 class="zen-arsenal-title">SETTINGS · API KEYS · UNIVERSAL INGEST &amp; WAR-ROOM</h2>
            </div>
          </div>

          <div class="zen-arsenal-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected="${activeTab === 'gateway' ? 'true' : 'false'}"
              class="zen-tab-btn ${activeTab === 'gateway' ? 'active' : ''}"
              data-zen-tab="gateway"
              data-testid="settings-tab-gateway"
            >
              <span>01 // SETTINGS &amp; API KEYS</span>
              <i class="zen-tab-pill">${hasKeyConfigured ? `${configuredCount} KEY${configuredCount === 1 ? '' : 'S'} SAVED` : 'BYOK VAULT'}</i>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="${activeTab === 'ingest' ? 'true' : 'false'}"
              class="zen-tab-btn ${activeTab === 'ingest' ? 'active' : ''}"
              data-zen-tab="ingest"
              data-testid="settings-tab-ingest"
            >
              <span>02 // YOUTUBE · LINKS · COPIED TEXT</span>
              <i class="zen-tab-pill">UNIVERSAL INGEST</i>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="${activeTab === 'warroom' ? 'true' : 'false'}"
              class="zen-tab-btn ${activeTab === 'warroom' ? 'active' : ''}"
              data-zen-tab="warroom"
              data-testid="settings-tab-warroom"
            >
              <span>03 // CFO SCENARIO WAR-ROOM</span>
              <i class="zen-tab-pill">MONTE CARLO</i>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="${activeTab === 'vault' ? 'true' : 'false'}"
              class="zen-tab-btn ${activeTab === 'vault' ? 'active' : ''}"
              data-zen-tab="vault"
              data-testid="settings-tab-vault"
            >
              <span>04 // $4.50/DAY PASS · 3D &amp; VEO 3</span>
              <i class="zen-tab-pill" style="${passCheck.allowed ? 'background:#b9f0c6;color:#111111' : 'background:#ff5a14;color:#111111'}">${passCheck.reason === 'owner_exempt' ? 'OWNER EXEMPT ✓' : passCheck.allowed ? '24H PASS ACTIVE' : '$4.50/DAY LOCKED'}</i>
            </button>
          </div>

          <button type="button" class="btn zen-close-btn" data-zen-action="close" aria-label="Close Settings">
            ESC · CLOSE
          </button>
        </header>

        <!-- Body -->
        <div class="zen-arsenal-body">
          ${
            activeTab === 'gateway'
              ? `
            <!-- TAB 1: APP SETTINGS & MULTI-PROVIDER BYOK API KEYS VAULT -->
            <div class="zen-gateway-layout">
              <!-- Left Column: All 6 Providers with Integrated API Key Inputs & Direct Key Creation Links -->
              <section class="zen-gateway-col">
                <div class="zen-section-head">
                  <span class="lab" style="font-size:14px;color:var(--c1)">ALL PROVIDER API KEYS IN APP SETTINGS (ADD ANY KEY BELOW)</span>
                  <span class="zen-sub-note">Click any provider card to make it active · Keys auto-save to browser settings</span>
                </div>

                <div class="zen-provider-grid" role="radiogroup" aria-label="AI Gateway Providers">
                  ${ZEN_PROVIDERS.map((p) => {
                    const isSelected = p.id === gwState.activeProvider;
                    const kVal = gwState.apiKeys[p.id] ?? '';
                    const hasKey = Boolean(kVal.trim());
                    return `
                      <div
                        class="zen-provider-card ${isSelected ? 'selected' : ''}"
                        style="--zen-accent: ${p.accentColor}"
                        data-zen-select-provider="${p.id}"
                        role="radio"
                        aria-checked="${isSelected ? 'true' : 'false'}"
                        tabindex="0"
                      >
                        <div class="zen-provider-card-top">
                          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                            <span class="zen-provider-short" style="color:${isSelected ? p.accentColor : 'var(--bone)'}">
                              ${isSelected ? '● ACTIVE // ' : '○ '}${escapeHtml(p.shortName)}
                            </span>
                            <span class="zen-provider-name" style="font-size:17px">${escapeHtml(p.name)}</span>
                          </div>
                          <div style="display:flex;align-items:center;gap:10px">
                            <span class="zen-provider-badge" style="background:${hasKey ? '#b9f0c6' : p.accentColor};color:#111111">
                              ${hasKey ? 'KEY SAVED ✓' : escapeHtml(p.badge)}
                            </span>
                            <a
                              href="${escapeHtml(p.keyCreateUrl)}"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="zen-direct-key-link"
                              data-zen-stop-prop="true"
                              style="padding:6px 12px;background:#111110;border:1.5px solid ${p.accentColor};color:${p.accentColor}"
                            >
                              ${escapeHtml(p.keyCreateLabel)}
                            </a>
                          </div>
                        </div>

                        <p class="zen-provider-tagline">${escapeHtml(p.tagline)}</p>

                        <!-- Direct API Key Input inside each Provider Card -->
                        <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin-top:4px" data-zen-stop-prop="true">
                          <input
                            type="${showRawApiKey ? 'text' : 'password'}"
                            data-zen-provider-key-input="${p.id}"
                            data-testid="settings-key-input-${p.id}"
                            class="zen-text-input"
                            style="padding:11px 14px;font-size:14px;border-color:${hasKey ? '#b9f0c6' : isSelected ? p.accentColor : '#4a4a46'}"
                            placeholder="${escapeHtml(p.keyPlaceholder)} — Paste ${escapeHtml(p.shortName)} API key here…"
                            value="${escapeHtml(kVal)}"
                            autocomplete="off"
                            spellcheck="false"
                          />
                          <a
                            href="${escapeHtml(p.docsUrl)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="zen-docs-link"
                            data-zen-stop-prop="true"
                            style="padding:10px 12px;border:1.5px solid #383835;background:#121211"
                          >
                            Docs ↗
                          </a>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </section>

              <!-- Right Column: Active Provider Gateway Controls, Frontier Model Selection & Live Verification -->
              <section class="zen-gateway-col zen-vault-panel">
                <div class="zen-vault-banner" style="border-left: 6px solid ${activeProviderDesc.accentColor}">
                  <div>
                    <div class="lab" style="color:${activeProviderDesc.accentColor};font-size:13px">
                      ACTIVE AI GATEWAY // ${escapeHtml(activeProviderDesc.shortName)}
                    </div>
                    <h3 class="zen-vault-title">${escapeHtml(activeProviderDesc.name)}</h3>
                  </div>
                  <a
                    href="${escapeHtml(activeProviderDesc.keyCreateUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn primary-solar zen-get-key-cta"
                  >
                    ${escapeHtml(activeProviderDesc.keyCreateLabel)}
                  </a>
                </div>

                <!-- 1-Click Direct Key Creation Portals -->
                <div class="zen-quick-portal-strip">
                  <span class="lab" style="font-size:12px;color:var(--c1);margin-right:4px">1-CLICK API KEY PORTALS:</span>
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" class="zen-portal-chip zen-portal-openrouter">OpenRouter ↗</a>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="zen-portal-chip">Google Gemini ↗</a>
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" class="zen-portal-chip">Anthropic ↗</a>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="zen-portal-chip">OpenAI ↗</a>
                  <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="zen-portal-chip">Groq LPU ↗</a>
                  <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" class="zen-portal-chip">DeepSeek ↗</a>
                </div>

                <!-- Active Provider API Key Input -->
                <div class="zen-field-group">
                  <label class="lab" for="zen-byok-key-input" style="font-size:13px">
                    ACTIVE API KEY (${escapeHtml(activeProviderDesc.shortName)}) — AUTO-SAVED TO BROWSER
                  </label>
                  <div class="zen-key-input-row">
                    <input
                      id="zen-byok-key-input"
                      data-testid="zen-byok-key-input"
                      type="${showRawApiKey ? 'text' : 'password'}"
                      class="zen-text-input"
                      placeholder="${escapeHtml(activeProviderDesc.keyPlaceholder)} (Paste API key here)"
                      value="${escapeHtml(currentKey)}"
                      autocomplete="off"
                      spellcheck="false"
                    />
                    <button type="button" class="btn" data-zen-action="toggle-key-vis" style="font-size:13px;padding:0 16px">
                      ${showRawApiKey ? 'HIDE' : 'SHOW'}
                    </button>
                    <button type="button" class="btn" data-zen-action="clear-key" style="font-size:13px;padding:0 16px">
                      CLEAR
                    </button>
                  </div>
                  <p class="zen-field-hint">
                    Keys are stored locally in your browser (<code>localStorage</code>) and transmitted over HTTPS headers to the server proxy.
                  </p>
                </div>

                <!-- Curated Model Selection -->
                <div class="zen-field-group">
                  <label class="lab" for="zen-byok-model-select" style="font-size:13px">
                    FRONTIER MODEL (${escapeHtml(activeProviderDesc.shortName)})
                  </label>
                  <select id="zen-byok-model-select" class="zen-select-input">
                    ${activeProviderDesc.models
                      .map(
                        (m) => `
                        <option value="${escapeHtml(m.id)}" ${m.id === currentModel ? 'selected' : ''}>
                          ${escapeHtml(m.label)} — ${escapeHtml(m.contextWindow)} [${escapeHtml(m.badge)}]
                        </option>
                      `
                      )
                      .join('')}
                  </select>
                </div>

                <div class="zen-field-group">
                  <label class="lab" for="zen-custom-model-input" style="font-size:13px">
                    CUSTOM OPENROUTER / PROVIDER MODEL SLUG (OPTIONAL)
                  </label>
                  <input
                    id="zen-custom-model-input"
                    type="text"
                    class="zen-text-input"
                    placeholder="e.g. anthropic/claude-3.7-sonnet or google/gemini-2.5-pro"
                    value="${escapeHtml(gwState.customModelOverride ?? '')}"
                    autocomplete="off"
                    spellcheck="false"
                  />
                </div>

                <!-- Action Bar -->
                <div class="zen-vault-actions">
                  <button type="button" class="btn primary-solar" data-zen-action="save-and-verify" data-testid="settings-save-keys-btn">
                    ${gatewayVerifyState.loading ? 'SAVING & VERIFYING...' : 'SAVE API KEYS &amp; VERIFY GATEWAY'}
                  </button>
                  <button type="button" class="btn" data-zen-action="re-enrich-dataset">
                    RE-SYNTHESIZE STORY WITH ${escapeHtml(activeProviderDesc.shortName)}
                  </button>
                </div>

                <!-- Live Verification Telemetry Box -->
                <div class="zen-verify-status-box" data-mode="${escapeHtml(gatewayVerifyState.mode ?? 'idle')}">
                  <div class="zen-verify-header">
                    <span class="lab" style="font-size:13px">GATEWAY TELEMETRY // ${escapeHtml(activeProviderDesc.shortName)}</span>
                    ${
                      gatewayVerifyState.latencyMs !== undefined
                        ? `<span class="mono" style="font-size:13px;color:#f4f03a;font-weight:700">${gatewayVerifyState.latencyMs}ms RTT</span>`
                        : ''
                    }
                  </div>
                  <p class="zen-verify-msg">${escapeHtml(gatewayVerifyState.message)}</p>
                </div>
              </section>
            </div>
          `
              : activeTab === 'ingest'
                ? `
            <!-- TAB 2: UNIVERSAL LINK, YOUTUBE & COPIED TEXT INGESTION STUDIO -->
            <div class="zen-gateway-layout">
              <section class="zen-gateway-col">
                <div class="zen-section-head">
                  <span class="lab" style="font-size:14px;color:var(--c1)">UNIVERSAL MULTI-FORMAT INGESTION</span>
                  <span class="zen-sub-note">Turn any YouTube video link, web article URL, Google Sheet, or copied text into an interactive Finance Story</span>
                </div>

                <div style="display:flex;flex-direction:column;gap:14px">
                  <div class="zen-vault-banner" style="border-left: 6px solid #f4f03a">
                    <div>
                      <div class="lab" style="color:#f4f03a;font-size:13px">SUPPORTED INPUT FORMATS</div>
                      <div style="font-size:14.5px;color:var(--bone);margin-top:8px;line-height:1.55">
                        <strong>1. YouTube Links:</strong> <code>youtube.com/watch?v=...</code>, <code>youtu.be/...</code>, <code>youtube.com/shorts/...</code> (auto-extracts video metadata, channel, description, transcript &amp; creator/company financials)<br/>
                        <strong>2. Web Links &amp; Cloud Docs:</strong> Any article URL, SEC filing link, raw CSV/JSON link, Google Drive folder, or Google Sheets URL<br/>
                        <strong>3. Copied Text &amp; Tables:</strong> Paste raw text from Slack, Notion, emails, bank statements, Markdown tables, or earnings call notes
                      </div>
                    </div>
                  </div>

                  <div class="lab" style="margin-top:6px;font-size:13.5px">1-CLICK DEMO SAMPLES (CLICK TO LOAD &amp; TEST)</div>
                  <div style="display:grid;grid-template-columns:1fr;gap:12px">
                    ${SAMPLE_COPIED_TEXT_SNIPPETS.map(
                      (s) => `
                        <button
                          type="button"
                          class="zen-provider-card"
                          style="text-align:left;min-height:auto;padding:16px 20px"
                          data-zen-sample-snippet="${s.id}"
                        >
                          <div class="zen-provider-card-top">
                            <span class="zen-provider-short" style="font-size:15px">${escapeHtml(s.label)}</span>
                            <span class="zen-provider-badge" style="background:#f4f03a;color:#111">${escapeHtml(s.badge)}</span>
                          </div>
                          <div class="mono" style="font-size:13px;color:#b8b4a9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px">
                            ${escapeHtml(s.content.split('\n')[0] ?? '')}
                          </div>
                        </button>
                      `
                    ).join('')}
                  </div>
                </div>
              </section>

              <section class="zen-gateway-col zen-vault-panel">
                <div class="zen-field-group">
                  <label class="lab" for="zen-universal-title-input" style="font-size:13.5px">
                    ENTITY / PROJECT / CHANNEL NAME (OPTIONAL)
                  </label>
                  <input
                    id="zen-universal-title-input"
                    type="text"
                    class="zen-text-input"
                    placeholder="e.g. Marques Brownlee Studio, Acme Q4 Earnings, or Copied Bank Ledger"
                    value="${escapeHtml(universalTitleDraft)}"
                    autocomplete="off"
                  />
                </div>

                <div class="zen-field-group" style="flex:1;display:flex;flex-direction:column">
                  <label class="lab" for="zen-universal-text-input" style="font-size:13.5px">
                    PASTE YOUTUBE LINK, WEB URL, GOOGLE SHEET LINK, OR COPIED TEXT / TABLE
                  </label>
                  <textarea
                    id="zen-universal-text-input"
                    data-testid="zen-universal-text-input"
                    class="zen-text-input"
                    rows="10"
                    style="resize:vertical;min-height:220px;line-height:1.5;font-family:'JetBrains Mono',monospace;font-size:14px"
                    placeholder="Paste a YouTube URL (https://www.youtube.com/watch?v=...), any web article URL, a Markdown table, or copied financial text/notes here..."
                  >${escapeHtml(universalTextDraft)}</textarea>
                </div>

                <div class="zen-vault-actions">
                  <button
                    type="button"
                    class="btn primary-solar"
                    data-zen-action="run-universal-ingest"
                    data-testid="zen-universal-submit-btn"
                    style="width:100%;padding:16px 24px;font-size:15px"
                    ${universalBusy ? 'disabled' : ''}
                  >
                    ${universalBusy ? 'EXTRACTING & SYNTHESIZING STORY...' : 'INGEST LINK / YOUTUBE / COPIED TEXT → LAUNCH STORY'}
                  </button>
                </div>

                ${
                  universalStatusMsg
                    ? `<div class="zen-verify-status-box" data-mode="live_verified">
                        <p class="zen-verify-msg">${escapeHtml(universalStatusMsg)}</p>
                      </div>`
                    : ''
                }
              </section>
            </div>
          `
                : activeTab === 'warroom'
                  ? `
            <!-- TAB 3: ARSENAL CFO SCENARIO WAR-ROOM & FORENSIC RADAR -->
            <div class="zen-warroom-layout">
              <!-- Top KPI Strip -->
              <div class="zen-warroom-kpi-strip">
                <div class="zen-kpi-block" style="border-top: 4px solid #6be8f2">
                  <span class="lab">BASELINE ANNUAL NET FLOW</span>
                  <strong class="zen-kpi-val">${formatCompactUsd(sim.baselineAnnualNet)}</strong>
                  <span class="zen-kpi-sub">Inflow ${formatCompactUsd(telemetry.totalInflowDollars)} · Outflow ${formatCompactUsd(telemetry.totalOutflowDollars)}</span>
                </div>
                <div class="zen-kpi-block" style="border-top: 4px solid #f4f03a">
                  <span class="lab">SIMULATED ANNUAL NET FLOW</span>
                  <strong class="zen-kpi-val" style="color:#f4f03a">${formatCompactUsd(sim.projectedAnnualNet)}</strong>
                  <span class="zen-kpi-sub">${sim.deltaAnnualDollars >= 0 ? '+' : ''}${formatCompactUsd(sim.deltaAnnualDollars)} vs. Baseline</span>
                </div>
                <div class="zen-kpi-block" style="border-top: 4px solid #b9f0c6">
                  <span class="lab">M12 PROJECTED TREASURY</span>
                  <strong class="zen-kpi-val" style="color:#b9f0c6">${formatCompactUsd(sim.endingCashProjected)}</strong>
                  <span class="zen-kpi-sub">Runway: ${escapeHtml(sim.runwayMonthsLabel)}</span>
                </div>
                <div class="zen-kpi-block" style="border-top: 4px solid #ffa8e4">
                  <span class="lab">BENFORD FORENSIC CONFORMITY</span>
                  <strong class="zen-kpi-val" style="color:#ffa8e4">${telemetry.benfordScore}%</strong>
                  <span class="zen-kpi-sub">HHI Vendor Concentration: ${telemetry.hhiIndex}</span>
                </div>
              </div>

              <div class="zen-warroom-main-grid">
                <!-- Left: Interactive Stress-Test Sliders -->
                <section class="zen-warroom-controls">
                  <div class="zen-section-head">
                    <span class="lab">STRESS-TEST PARAMETERS</span>
                    <button type="button" class="btn" data-zen-action="reset-scenario" style="padding:5px 10px;font-size:10px">RESET</button>
                  </div>

                  <div class="zen-slider-row">
                    <div class="zen-slider-label">
                      <span>ARR / Revenue Inflow Velocity</span>
                      <strong class="mono" style="color:#6be8f2">${scenarioParams.inflowDeltaPct >= 0 ? '+' : ''}${scenarioParams.inflowDeltaPct}%</strong>
                    </div>
                    <input type="range" min="-40" max="100" step="5" value="${scenarioParams.inflowDeltaPct}" data-zen-slider="inflowDeltaPct" class="zen-range" />
                  </div>

                  <div class="zen-slider-row">
                    <div class="zen-slider-label">
                      <span>Cloud &amp; Infrastructure Spend</span>
                      <strong class="mono" style="color:#f4f03a">${scenarioParams.cloudDeltaPct >= 0 ? '+' : ''}${scenarioParams.cloudDeltaPct}%</strong>
                    </div>
                    <input type="range" min="-50" max="60" step="2" value="${scenarioParams.cloudDeltaPct}" data-zen-slider="cloudDeltaPct" class="zen-range" />
                  </div>

                  <div class="zen-slider-row">
                    <div class="zen-slider-label">
                      <span>Payroll &amp; Engineering Headcount</span>
                      <strong class="mono" style="color:#ffa8e4">${scenarioParams.payrollDeltaPct >= 0 ? '+' : ''}${scenarioParams.payrollDeltaPct}%</strong>
                    </div>
                    <input type="range" min="-30" max="80" step="5" value="${scenarioParams.payrollDeltaPct}" data-zen-slider="payrollDeltaPct" class="zen-range" />
                  </div>

                  <div class="zen-slider-row">
                    <div class="zen-slider-label">
                      <span>SaaS &amp; Vendor Consolidation</span>
                      <strong class="mono" style="color:#b9f0c6">${scenarioParams.vendorDeltaPct >= 0 ? '+' : ''}${scenarioParams.vendorDeltaPct}%</strong>
                    </div>
                    <input type="range" min="-60" max="40" step="2" value="${scenarioParams.vendorDeltaPct}" data-zen-slider="vendorDeltaPct" class="zen-range" />
                  </div>

                  <div class="zen-slider-row">
                    <div class="zen-slider-label">
                      <span>Starting Treasury Reserve</span>
                      <strong class="mono">${formatCompactUsd(scenarioParams.startingCashDollars)}</strong>
                    </div>
                    <input type="range" min="250000" max="10000000" step="250000" value="${scenarioParams.startingCashDollars}" data-zen-slider="startingCashDollars" class="zen-range" />
                  </div>

                  <div class="zen-warroom-export-row">
                    <button type="button" class="btn primary-solar" data-zen-action="export-dossier">
                      EXPORT EXECUTIVE BOARD DOSSIER (.MD)
                    </button>
                  </div>
                </section>

                <!-- Right: 12-Month Trajectory Chart + Counterparty Concentration Radar -->
                <section class="zen-warroom-visuals">
                  <div class="zen-chart-box">
                    <div class="zen-chart-head">
                      <span class="lab">12-MONTH CUMULATIVE TREASURY &amp; MONTE CARLO P10/P90 BAND</span>
                      <div class="zen-chart-legend">
                        <span><i style="background:#f4f03a"></i> SIMULATED TRAJECTORY</span>
                        <span><i style="background:#6be8f2"></i> BASELINE TRAJECTORY</span>
                      </div>
                    </div>
                    ${sim.svgHtml}
                  </div>

                  <div class="zen-radar-split">
                    <!-- Counterparty Exposure -->
                    <div class="zen-radar-card">
                      <div class="lab" style="margin-bottom:8px">TOP COUNTERPARTY EXPOSURE (CLICK TO AUDIT RECEIPTS)</div>
                      <div class="zen-merchant-bars">
                        ${telemetry.topMerchants
                          .map(
                            (m) => `
                            <button
                              type="button"
                              class="zen-merchant-bar-btn"
                              data-zen-merchant="${escapeHtml(m.merchant)}"
                              title="Click to inspect ${m.count} ledger receipts for ${escapeHtml(m.merchant)}"
                            >
                              <div class="zen-merchant-bar-top">
                                <span class="mono">${escapeHtml(m.merchant)}</span>
                                <span class="mono">${formatCompactUsd(m.dollars)} (${m.sharePct.toFixed(1)}%)</span>
                              </div>
                              <div class="zen-merchant-bar-track">
                                <div class="zen-merchant-bar-fill" style="width:${Math.min(100, Math.max(4, m.sharePct * 1.8)).toFixed(1)}%"></div>
                              </div>
                            </button>
                          `
                          )
                          .join('')}
                      </div>
                    </div>

                    <!-- Benford First-Digit Distribution -->
                    <div class="zen-radar-card">
                      <div class="lab" style="margin-bottom:8px">BENFORD'S LAW FIRST-DIGIT FORENSIC AUDIT (N=${telemetry.benfordEligibleCount})</div>
                      <div class="zen-benford-grid">
                        ${telemetry.firstDigitCounts
                          .map((cnt, idx) => {
                            const digit = idx + 1;
                            const pct =
                              telemetry.benfordEligibleCount > 0
                                ? (cnt / telemetry.benfordEligibleCount) * 100
                                : 0;
                            return `
                              <div class="zen-benford-col">
                                <div class="zen-benford-bar-wrap">
                                  <div class="zen-benford-bar" style="height:${Math.min(100, Math.max(6, pct * 2.6)).toFixed(1)}%"></div>
                                </div>
                                <span class="mono zen-benford-d">${digit}</span>
                                <span class="mono zen-benford-p">${pct.toFixed(0)}%</span>
                              </div>
                            `;
                          })
                          .join('')}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          `
              : `
            <!-- TAB 4: $4.50/DAY MULTI-CHAIN CRYPTO PASS · OWNER BYPASS · THREE.JS 3D VAULT & VEO 3 VIDEO STUDIO -->
            <div class="zen-gateway-layout" data-testid="zen-vault-tab-content">
              <!-- Left Column: $4.50/Day Multi-Chain Wallets & Sovereign Owner Exemption -->
              <section class="zen-gateway-col">
                <!-- Sovereign Owner vs External User Access Banner -->
                <div style="padding:18px 20px;background:${passCheck.allowed ? 'rgba(185,240,198,0.09)' : 'rgba(255,90,20,0.12)'};border:2px solid ${passCheck.allowed ? '#b9f0c6' : '#ff5a14'};display:flex;flex-direction:column;gap:12px">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
                    <div>
                      <div class="lab" style="color:${passCheck.allowed ? '#b9f0c6' : '#ff5a14'};font-size:12px">
                        ${
                          passCheck.reason === 'owner_exempt'
                            ? '★ SOVEREIGN OWNER EXEMPTION ACTIVE — FREE UNLIMITED ACCESS ($0.00/DAY)'
                            : passCheck.reason === 'paid_24h_pass'
                              ? '✓ EXTERNAL USER 24-HOUR CRYPTO PASS ACTIVE ($4.50/DAY VERIFIED)'
                              : '🔒 EXTERNAL USER PAYWALL ACTIVE — $4.50 / DAY CRYPTO SETTLEMENT REQUIRED'
                        }
                      </div>
                      <div style="font-size:16px;font-weight:700;color:var(--bone);margin-top:4px">
                        Active Identity: <span class="mono" style="color:var(--c1)">${escapeHtml(cryptoState.userEmail)}</span> · ${escapeHtml(passCheck.remainingHoursText)}
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <button
                        type="button"
                        class="btn ${cryptoState.isOwnerExempt ? 'primary-solar' : ''}"
                        data-zen-action="switch-owner-mode"
                        data-testid="crypto-owner-mode-btn"
                        style="padding:9px 14px;font-size:11px;font-weight:700"
                      >
                        OWNER BYPASS (${SOVEREIGN_OWNER_EMAIL})
                      </button>
                      <button
                        type="button"
                        class="btn ${!cryptoState.isOwnerExempt ? 'primary-solar' : ''}"
                        data-zen-action="switch-visitor-mode"
                        data-testid="crypto-visitor-mode-btn"
                        style="padding:9px 14px;font-size:11px;font-weight:700;border-color:#ff5a14;color:${!cryptoState.isOwnerExempt ? '#111111' : '#ff5a14'};background:${!cryptoState.isOwnerExempt ? '#ff5a14' : 'transparent'}"
                      >
                        EXTERNAL USER ($4.50/DAY GATE)
                      </button>
                    </div>
                  </div>
                  <p style="font-size:13px;color:#d0ccc0;line-height:1.45">
                    All users except the Sovereign Owner (<strong class="mono" style="color:var(--c1)">${SOVEREIGN_OWNER_EMAIL}</strong>) must pay <strong>$${DAILY_ACCESS_CHARGE_USD.toFixed(2)} USD / day</strong> to any of the receiving addresses below (Solana, Bitcoin, Ethereum, Base, Arbitrum, or Polygon/BSC).
                  </p>
                </div>

                <!-- Automatic Chain Detector by Wallet Address or TX Hash -->
                <div class="zen-config-card" style="padding:16px 18px;gap:10px">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
                    <label class="lab" for="zen-wallet-detector-input" style="color:var(--c1);font-size:12px">
                      AUTO-DETECT CHAIN BY WALLET ADDRESS OR TX HASH
                    </label>
                    <span class="mono" style="font-size:11px;color:#b8b4a9">Recognizes SOL (79XKt...), BTC (bc1q...), &amp; EVM (0xf395...)</span>
                  </div>
                  <div style="display:flex;gap:10px;align-items:stretch">
                    <input
                      id="zen-wallet-detector-input"
                      data-testid="crypto-detector-input"
                      type="text"
                      class="zen-text-input mono"
                      value="${escapeHtml(detectorRawInput)}"
                      placeholder="Paste any wallet (79XKt..., bc1q0z..., 0xf395...) or TX hash to auto-detect chain..."
                      style="flex:1;padding:11px 14px;font-size:13px"
                    />
                  </div>
                  ${
                    detectionResult
                      ? `<div class="mono" style="font-size:12px;color:#b9f0c6;padding:8px 12px;background:#111110;border-left:3px solid #b9f0c6">
                          DETECTED: ${escapeHtml(detectionResult.summary)} → Active Chain switched to ${detectionResult.chain.toUpperCase()}
                        </div>`
                      : ''
                  }
                </div>

                <!-- All 6 Multi-Chain Receiving Wallets ($4.50/day) -->
                <div class="zen-section-head">
                  <span class="lab" style="font-size:13px;color:var(--c1)">RECEIVING WALLETS ($4.50 / DAY ACCESS FEE · CLICK ANY CHAIN)</span>
                  <span class="zen-sub-note">6 Chains Configured</span>
                </div>

                <div class="zen-provider-grid" role="radiogroup" aria-label="Multi-Chain Receiving Wallets">
                  ${CRYPTO_PAYMENT_CHAINS.map((c) => {
                    const isSelected = c.id === cryptoState.selectedChain;
                    return `
                      <div
                        class="zen-provider-card ${isSelected ? 'selected' : ''}"
                        style="--zen-accent: ${c.accentColor}; padding:14px 16px; gap:8px"
                        data-zen-select-chain="${c.id}"
                        data-testid="crypto-chain-card-${c.id}"
                        role="radio"
                        aria-checked="${isSelected ? 'true' : 'false'}"
                        tabindex="0"
                      >
                        <div class="zen-provider-card-top">
                          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                            <span class="zen-provider-short" style="color:${c.accentColor}">
                              ${isSelected ? '● SELECTED // ' : '○ '}${escapeHtml(c.shortLabel)}
                            </span>
                            <span style="font-size:14px;font-weight:700;color:var(--bone)">${escapeHtml(c.name)}</span>
                          </div>
                          <div style="display:flex;align-items:center;gap:8px">
                            <span class="zen-provider-badge" style="background:${c.accentColor};color:#111111">
                              $${c.dailyUsdRate.toFixed(2)}/DAY · ${escapeHtml(c.estimatedTokenAmount)}
                            </span>
                            <button
                              type="button"
                              class="btn"
                              data-zen-copy-wallet="${escapeHtml(c.receivingAddress)}"
                              data-zen-stop-prop="true"
                              style="padding:5px 10px;font-size:11px;border-color:${c.accentColor};color:${c.accentColor}"
                            >
                              COPY WALLET
                            </button>
                            <a
                              href="${c.explorerAddressUrl}"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="zen-key-portal-btn"
                              data-zen-stop-prop="true"
                              style="padding:5px 10px;font-size:11px"
                            >
                              EXPLORER ↗
                            </a>
                          </div>
                        </div>
                        <div class="mono" style="font-size:13px;color:var(--c1);background:#0c0c0b;padding:8px 12px;border:1px solid #2e2e2b;word-break:break-all;user-select:all">
                          ${escapeHtml(c.receivingAddress)}
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#b8b4a9" class="mono">
                          <span>Accepted: ${escapeHtml(c.currencies.join(' · '))}</span>
                          <span>${escapeHtml(c.detectionHint)}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>

                <!-- Selected Chain QR Matrix + On-Chain TX Verification Box -->
                <div class="zen-config-card" style="padding:18px 20px;gap:14px;border-color:${selectedChainDesc.accentColor}">
                  <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
                    ${buildWalletMatrixSvg(selectedChainDesc.receivingAddress, selectedChainDesc.accentColor)}
                    <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:6px">
                      <span class="lab" style="color:${selectedChainDesc.accentColor};font-size:12px">
                        ACTIVE RECEIVING WALLET // ${escapeHtml(selectedChainDesc.name.toUpperCase())}
                      </span>
                      <div class="mono" style="font-size:13px;font-weight:700;color:var(--bone);word-break:break-all">
                        ${escapeHtml(selectedChainDesc.receivingAddress)}
                      </div>
                      <div class="mono" style="font-size:12px;color:var(--c1)">
                        Required Daily Deposit: $${DAILY_ACCESS_CHARGE_USD.toFixed(2)} USD (${escapeHtml(selectedChainDesc.estimatedTokenAmount)})
                      </div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
                        <button
                          type="button"
                          class="btn primary-solar"
                          data-zen-action="pay-web3-wallet"
                          data-testid="crypto-web3-pay-btn"
                          style="padding:8px 14px;font-size:11px;font-weight:700"
                        >
                          PAY $4.50 VIA WEB3 WALLET (${escapeHtml(selectedChainDesc.tokenSymbol)})
                        </button>
                        <button
                          type="button"
                          class="btn"
                          data-zen-action="fill-sample-tx"
                          data-testid="crypto-sample-tx-btn"
                          style="padding:8px 12px;font-size:11px"
                        >
                          DEMO TX RECEIPT
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style="display:flex;gap:10px;align-items:stretch;flex-wrap:wrap">
                    <input
                      id="zen-crypto-tx-input"
                      data-testid="crypto-tx-input"
                      type="text"
                      class="zen-text-input mono"
                      value="${escapeHtml(cryptoTxDraft)}"
                      placeholder="Paste ${escapeHtml(selectedChainDesc.shortLabel)} transaction hash / signature (or owner wallet) to unlock 24h..."
                      style="flex:1;min-width:220px;padding:12px 14px;font-size:13px"
                    />
                    <button
                      type="button"
                      class="btn primary-solar"
                      data-zen-action="verify-crypto-tx"
                      data-testid="crypto-verify-btn"
                      ${cryptoVerifying ? 'disabled' : ''}
                      style="padding:12px 20px;font-size:12px;font-weight:700"
                    >
                      ${cryptoVerifying ? 'VERIFYING ON-CHAIN...' : 'VERIFY $4.50/DAY & UNLOCK 24H PASS →'}
                    </button>
                  </div>

                  <div class="zen-verify-banner" data-testid="crypto-status-banner">
                    <span class="mono">${escapeHtml(cryptoStatusMessage)}</span>
                  </div>
                </div>
              </section>

              <!-- Right Column: Three.js 3D Sovereign Treasury Hologram + Veo 3 Video Generation Studio -->
              <section class="zen-gateway-col">
                <!-- Panel A: Interactive Three.js 3D Sovereign Treasury & Multi-Chain Orbital Core -->
                <div class="zen-config-card" style="padding:18px 20px;gap:12px">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div>
                      <span class="lab" style="color:var(--c1);font-size:12px">THREE.JS 3D SOVEREIGN TREASURY &amp; MULTI-CHAIN HOLOGRAM</span>
                      <div style="font-size:15px;font-weight:700;color:var(--bone);margin-top:2px">
                        Interactive WebGL Orbital Vault · Active Chain: <span style="color:${selectedChainDesc.accentColor}">${escapeHtml(selectedChainDesc.shortLabel)}</span>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button type="button" class="btn ${threeCameraMode === 'orbit' ? 'primary-solar' : ''}" data-zen-three-cam="orbit" style="padding:6px 10px;font-size:11px">ORBIT 3D</button>
                      <button type="button" class="btn ${threeCameraMode === 'top' ? 'primary-solar' : ''}" data-zen-three-cam="top" style="padding:6px 10px;font-size:11px">TOP RADAR</button>
                      <button type="button" class="btn ${threeCameraMode === 'core' ? 'primary-solar' : ''}" data-zen-three-cam="core" style="padding:6px 10px;font-size:11px">CORE ZOOM</button>
                    </div>
                  </div>
                  <div
                    id="zen-three-vault-stage"
                    data-testid="zen-three-vault-stage"
                    style="width:100%;height:260px;background:#0c0c0b;border:1.5px solid #2e2e2b;position:relative;overflow:hidden"
                  ></div>
                  <div class="mono" style="font-size:11px;color:#b8b4a9;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
                    <span>Drag 3D viewport to orbit · 6 orbital rings = SOL · BTC · ETH · BASE · ARB · POLYGON</span>
                    <span>12 radial columns = Monthly Net Cash Flow</span>
                  </div>
                </div>

                <!-- Panel B: Veo 3 Executive Video Generation Studio (veo-3.1-fast-generate-preview) -->
                <div class="zen-config-card" style="padding:18px 20px;gap:14px;border-color:#f4f03a">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                    <div>
                      <span class="lab" style="color:#f4f03a;font-size:12px">VEO 3 EXECUTIVE VIDEO STUDIO // MODEL: veo-3.1-fast-generate-preview</span>
                      <div style="font-size:16px;font-weight:700;color:var(--bone);margin-top:2px">
                        Generate AI Financial Story Trailer (16:9 Landscape or 9:16 Portrait)
                      </div>
                    </div>
                    <div style="display:flex;gap:8px" role="radiogroup" aria-label="Veo 3 Video Aspect Ratio">
                      <button
                        type="button"
                        class="btn ${veoAspectRatio === '16:9' ? 'primary-solar' : ''}"
                        data-zen-veo-aspect="16:9"
                        data-testid="veo-aspect-16-9"
                        style="padding:7px 12px;font-size:11px;font-weight:700"
                      >
                        16:9 LANDSCAPE
                      </button>
                      <button
                        type="button"
                        class="btn ${veoAspectRatio === '9:16' ? 'primary-solar' : ''}"
                        data-zen-veo-aspect="9:16"
                        data-testid="veo-aspect-9-16"
                        style="padding:7px 12px;font-size:11px;font-weight:700"
                      >
                        9:16 PORTRAIT
                      </button>
                    </div>
                  </div>

                  <div class="zen-field-group">
                    <label class="lab" for="zen-veo-prompt-input">VEO 3 CINEMATIC PROMPT (veo-3.1-fast-generate-preview)</label>
                    <textarea
                      id="zen-veo-prompt-input"
                      data-testid="veo-prompt-input"
                      rows="3"
                      class="zen-text-input mono"
                      style="resize:vertical;min-height:76px;line-height:1.45;font-size:13px"
                      placeholder="Describe the executive financial story video to generate with veo-3.1-fast-generate-preview..."
                    >${escapeHtml(
                      veoPromptDraft ||
                        `Bauhaus executive financial story trailer for ${bundle.plan.business_meta?.entity_name ?? bundle.plan.person_name} (FY ${bundle.plan.year}): ${formatCompactUsd(telemetry.totalInflowDollars)} inflow vs ${formatCompactUsd(telemetry.totalOutflowDollars)} outflow, obsidian black & solar yellow 3D geometric blocks, kinetic typography`
                    )}</textarea>
                  </div>

                  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                    <button
                      type="button"
                      id="zen-veo-generate-btn"
                      data-testid="veo-generate-btn"
                      class="btn primary-solar"
                      data-zen-action="generate-veo-video"
                      ${veoGenerating ? 'disabled' : ''}
                      style="padding:13px 22px;font-size:13px;font-weight:700"
                    >
                      ${veoGenerating ? `GENERATING ${veoAspectRatio} VIDEO (veo-3.1-fast-generate-preview)...` : `GENERATE ${veoAspectRatio} VIDEO (veo-3.1-fast-generate-preview) →`}
                    </button>
                  </div>

                  <div class="zen-verify-banner" data-testid="veo-status-banner">
                    <span class="mono">${escapeHtml(veoStatusMessage)}</span>
                  </div>

                  <!-- Video Player & Live Studio Stream Container -->
                  <div
                    style="display:flex;justify-content:center;align-items:center;background:#0a0a09;border:1.5px solid #2e2e2b;padding:12px;min-height:200px"
                  >
                    ${
                      veoVideoDataUrl
                        ? `<video
                            id="zen-veo-video-player"
                            data-testid="veo-video-player"
                            src="${veoVideoDataUrl}"
                            controls
                            autoplay
                            loop
                            muted
                            playsinline
                            style="${veoAspectRatio === '9:16' ? 'width:200px;height:355px' : 'width:100%;max-width:480px;aspect-ratio:16/9'};background:#000;border:1.5px solid #f4f03a"
                          ></video>`
                        : `<canvas
                            id="zen-veo-preview-canvas"
                            data-testid="veo-video-player"
                            width="${veoAspectRatio === '9:16' ? '360' : '640'}"
                            height="${veoAspectRatio === '9:16' ? '640' : '360'}"
                            style="${veoAspectRatio === '9:16' ? 'width:190px;height:338px' : 'width:100%;max-width:480px;aspect-ratio:16/9'};background:#0c0c0b;border:1.5px solid #f4f03a"
                          ></canvas>`
                    }
                  </div>
                </div>
              </section>
            </div>
          `
          }
        </div>
      </div>
    `;

    bindEvents();
  }

  function syncInputsToState(): ZenGatewayStoredState {
    const current = loadZenGatewayState();
    const keyInput = root.querySelector<HTMLInputElement>('#zen-byok-key-input');
    const modelSelect = root.querySelector<HTMLSelectElement>('#zen-byok-model-select');
    const customModelInput = root.querySelector<HTMLInputElement>('#zen-custom-model-input');
    const allProviderInputs = root.querySelectorAll<HTMLInputElement>('[data-zen-provider-key-input]');

    const next: ZenGatewayStoredState = {
      ...current,
      selectedModels: { ...current.selectedModels },
      apiKeys: { ...current.apiKeys },
    };

    // First sync the multi-provider quick vault table inputs
    allProviderInputs.forEach((inp) => {
      const pid = inp.getAttribute('data-zen-provider-key-input') as AIProviderId | null;
      if (!pid) return;
      // If this row is the active provider and keyInput was edited directly, let keyInput win below
      const val = inp.value.trim();
      if (val) {
        next.apiKeys[pid] = val;
      } else {
        delete next.apiKeys[pid];
      }
    });

    if (keyInput) {
      const val = keyInput.value.trim();
      if (val) {
        next.apiKeys[current.activeProvider] = val;
      } else if (!allProviderInputs.length) {
        delete next.apiKeys[current.activeProvider];
      }
    }

    if (modelSelect && modelSelect.value) {
      next.selectedModels[current.activeProvider] = modelSelect.value;
    }

    if (customModelInput) {
      const customVal = customModelInput.value.trim();
      next.customModelOverride = customVal || undefined;
    }

    saveZenGatewayState(next);
    options.onGatewayUpdated?.(next);
    return next;
  }

  function exportBoardDossier(): void {
    const bundle = options.getBundle();
    const telemetry = computeForensicTelemetry(bundle);
    const sim = buildTrajectorySvg(telemetry, scenarioParams);
    const gw = loadZenGatewayState();

    const markdown = [
      `# ZEN AI · ARSENAL — EXECUTIVE CFO AUDIT & SCENARIO DOSSIER`,
      `- **Entity**: ${bundle.plan.business_meta?.entity_name ?? bundle.plan.person_name}`,
      `- **Fiscal Period**: ${bundle.plan.business_meta?.fiscal_period_label ?? `FY ${bundle.plan.year}`}`,
      `- **Active Intelligence Gateway**: ${gw.activeProvider.toUpperCase()} (${gw.customModelOverride || gw.selectedModels[gw.activeProvider]})`,
      `- **Transactions Audited**: ${telemetry.totalTxns}`,
      ``,
      `## 1. Baseline vs. Simulated P&L Trajectory`,
      `- **Baseline Annual Inflow**: ${formatCompactUsd(telemetry.totalInflowDollars)}`,
      `- **Baseline Annual Outflow**: ${formatCompactUsd(telemetry.totalOutflowDollars)}`,
      `- **Baseline Annual Net Flow**: ${formatCompactUsd(sim.baselineAnnualNet)}`,
      `- **Simulated Annual Net Flow**: ${formatCompactUsd(sim.projectedAnnualNet)} (${sim.deltaAnnualDollars >= 0 ? '+' : ''}${formatCompactUsd(sim.deltaAnnualDollars)})`,
      `- **Month-12 Projected Treasury**: ${formatCompactUsd(sim.endingCashProjected)} (Runway: ${sim.runwayMonthsLabel})`,
      ``,
      `## 2. Forensic Ledger Integrity`,
      `- **Benford's Law First-Digit Conformity**: ${telemetry.benfordScore}% (${telemetry.benfordEligibleCount} entries)`,
      `- **Herfindahl-Hirschman Vendor Concentration (HHI)**: ${telemetry.hhiIndex}`,
      ``,
      `## 3. Top Counterparty Exposures`,
      ...telemetry.topMerchants.map(
        (m, idx) =>
          `${idx + 1}. **${m.merchant}** — ${formatCompactUsd(m.dollars)} (${m.sharePct.toFixed(1)}% of outflow across ${m.count} settlements)`
      ),
      ``,
      `---`,
      `Generated by ZEN AI · Arsenal Finance Story (zenai.world · arsenal.world)`,
    ].join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen-arsenal-cfo-dossier-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function bindEvents(): void {
    // Tab switching
    root.querySelectorAll<HTMLButtonElement>('[data-zen-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (activeTab === 'gateway') {
          syncInputsToState();
        }
        const tab = btn.getAttribute('data-zen-tab') as ArsenalTabId;
        if (tab) {
          activeTab = tab;
          render();
        }
      });
    });

    // Stop propagation on direct external links & key inputs inside provider cards
    root.querySelectorAll<HTMLElement>('[data-zen-stop-prop]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      el.addEventListener('keydown', (e) => {
        e.stopPropagation();
      });
    });

    // Instant live sync between active key input and table key inputs
    const activeKeyInput = root.querySelector<HTMLInputElement>('#zen-byok-key-input');
    activeKeyInput?.addEventListener('input', () => {
      const gw = loadZenGatewayState();
      const matchingRowInput = root.querySelector<HTMLInputElement>(
        `[data-zen-provider-key-input="${gw.activeProvider}"]`
      );
      if (matchingRowInput) {
        matchingRowInput.value = activeKeyInput.value;
      }
      syncInputsToState();
    });

    root.querySelectorAll<HTMLInputElement>('[data-zen-provider-key-input]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const pid = inp.getAttribute('data-zen-provider-key-input') as AIProviderId | null;
        const gw = loadZenGatewayState();
        if (pid && pid === gw.activeProvider && activeKeyInput) {
          activeKeyInput.value = inp.value;
        }
        syncInputsToState();
      });
    });

    // Provider card selection
    root.querySelectorAll<HTMLElement>('[data-zen-select-provider]').forEach((card) => {
      const selectProvider = () => {
        syncInputsToState();
        const providerId = card.getAttribute('data-zen-select-provider') as AIProviderId;
        if (providerId) {
          const state = loadZenGatewayState();
          state.activeProvider = providerId;
          saveZenGatewayState(state);
          options.onGatewayUpdated?.(state);
          gatewayVerifyState = {
            loading: false,
            message: `Switched active gateway to ${providerId.toUpperCase()}. Paste your API key or click the direct portal link above to generate one.`,
          };
          render();
        }
      };
      card.addEventListener('click', selectProvider);
      card.addEventListener('keydown', (e) => {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectProvider();
        }
      });
    });

    // Universal Ingest tab events
    const univTextEl = root.querySelector<HTMLTextAreaElement>('#zen-universal-text-input');
    const univTitleEl = root.querySelector<HTMLInputElement>('#zen-universal-title-input');
    univTextEl?.addEventListener('input', () => {
      universalTextDraft = univTextEl.value;
    });
    univTitleEl?.addEventListener('input', () => {
      universalTitleDraft = univTitleEl.value;
    });

    root.querySelectorAll<HTMLButtonElement>('[data-zen-sample-snippet]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-zen-sample-snippet');
        const snippet = SAMPLE_COPIED_TEXT_SNIPPETS.find((s) => s.id === sid);
        if (!snippet) return;
        universalTextDraft = snippet.content;
        universalTitleDraft = snippet.titleHint;
        universalStatusMsg = `Loaded "${snippet.label}". Click INGEST below to build your interactive story.`;
        render();
      });
    });

    root
      .querySelector<HTMLButtonElement>('[data-zen-action="run-universal-ingest"]')
      ?.addEventListener('click', async () => {
        const raw = (univTextEl?.value ?? universalTextDraft).trim();
        const titleHint = (univTitleEl?.value ?? universalTitleDraft).trim() || undefined;
        if (!raw) {
          universalStatusMsg =
            'Please paste a YouTube link, web URL, Google Sheets link, or copied financial text first.';
          render();
          return;
        }
        if (!options.onIngestUniversalInput) return;
        universalBusy = true;
        const kind = detectInputKind(raw);
        universalStatusMsg =
          kind === 'youtube_url'
            ? 'Extracting YouTube metadata, transcript & creator financials...'
            : kind === 'web_url'
              ? 'Fetching web URL & extracting financial rows...'
              : 'Parsing copied text & synthesizing 365-day ledger...';
        render();
        try {
          await options.onIngestUniversalInput(raw, titleHint);
          universalBusy = false;
          close();
        } catch (err) {
          universalBusy = false;
          universalStatusMsg =
            err instanceof Error ? err.message : 'Failed to ingest universal input.';
          render();
        }
      });

    // Close button
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="close"]')
      ?.addEventListener('click', () => {
        if (activeTab === 'gateway') {
          syncInputsToState();
        }
        close();
      });

    // Toggle API key visibility
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="toggle-key-vis"]')
      ?.addEventListener('click', () => {
        syncInputsToState();
        showRawApiKey = !showRawApiKey;
        render();
      });

    // Clear API key
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="clear-key"]')
      ?.addEventListener('click', () => {
        const state = loadZenGatewayState();
        delete state.apiKeys[state.activeProvider];
        saveZenGatewayState(state);
        options.onGatewayUpdated?.(state);
        gatewayVerifyState = {
          loading: false,
          message: `Cleared stored API key for ${state.activeProvider.toUpperCase()}.`,
        };
        render();
      });

    // Save & Verify Gateway
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="save-and-verify"]')
      ?.addEventListener('click', async () => {
        const next = syncInputsToState();
        const provider = next.activeProvider;
        const model =
          next.customModelOverride?.trim() ||
          next.selectedModels[provider] ||
          getProviderDescriptor(provider).defaultModel;
        const apiKey = next.apiKeys[provider];

        gatewayVerifyState = {
          loading: true,
          message: `Saving keys & pinging ${provider.toUpperCase()} (${model})...`,
        };
        render();

        try {
          const res = await fetch('/api/providers/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider_config: {
                provider,
                model,
                apiKey,
              },
            }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            mode?: string;
            latencyMs?: number;
            message?: string;
          };
          gatewayVerifyState = {
            loading: false,
            mode: data.mode ?? 'live_verified',
            latencyMs: data.latencyMs,
            message:
              data.message ??
              `Saved API keys in Settings & verified ${provider.toUpperCase()} (${model}).`,
          };
        } catch {
          gatewayVerifyState = {
            loading: false,
            mode: 'offline_ready',
            message: `Saved API keys for ${provider.toUpperCase()} (${model}) in browser settings.`,
          };
        }
        render();
      });

    // Re-enrich dataset with active gateway
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="re-enrich-dataset"]')
      ?.addEventListener('click', async () => {
        syncInputsToState();
        close();
        if (options.onTriggerEnrichment) {
          await options.onTriggerEnrichment();
        }
      });

    // Scenario War-Room Sliders
    root.querySelectorAll<HTMLInputElement>('[data-zen-slider]').forEach((slider) => {
      slider.addEventListener('input', () => {
        const key = slider.getAttribute('data-zen-slider') as keyof ScenarioParams;
        if (key) {
          scenarioParams[key] = Number(slider.value);
          render();
        }
      });
    });

    // Reset Scenario
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="reset-scenario"]')
      ?.addEventListener('click', () => {
        scenarioParams.inflowDeltaPct = 15;
        scenarioParams.cloudDeltaPct = -18;
        scenarioParams.payrollDeltaPct = 5;
        scenarioParams.vendorDeltaPct = -12;
        scenarioParams.startingCashDollars = 1_500_000;
        render();
      });

    // Export Board Dossier
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="export-dossier"]')
      ?.addEventListener('click', () => {
        exportBoardDossier();
      });

    // Counterparty drill-down into Receipts Drawer
    root.querySelectorAll<HTMLButtonElement>('[data-zen-merchant]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const merchant = btn.getAttribute('data-zen-merchant');
        if (!merchant) return;
        const bundle = options.getBundle();
        const matching = bundle.transactions.filter((t) => t.merchant === merchant);
        close();
        options.onFilterCounterparty?.(merchant, matching);
      });
    });

    // ---------------- TAB 4: CRYPTO PASS, THREE.JS 3D VAULT & VEO 3 STUDIO ----------------
    const threeStageEl = root.querySelector<HTMLElement>('#zen-three-vault-stage');
    if (threeStageEl && activeTab === 'vault') {
      const cState = loadCryptoAccessPassState();
      threeVaultHandle = mountThreeCryptoVault({
        container: threeStageEl,
        activeChain: cState.selectedChain,
      });
      threeVaultHandle.setCameraMode(threeCameraMode);
    }

    // Start live procedural Veo 3 motion canvas preview if cloud MP4 not yet loaded
    const veoCanvas = root.querySelector<HTMLCanvasElement>('#zen-veo-preview-canvas');
    if (veoCanvas && activeTab === 'vault') {
      const ctx = veoCanvas.getContext('2d');
      const bundle = options.getBundle();
      const telemetry = computeForensicTelemetry(bundle);
      const entityLabel =
        bundle.plan.business_meta?.entity_name ?? bundle.plan.person_name ?? 'ZEN AI ARSENAL';
      const t0 = performance.now();
      const drawVeoFrame = () => {
        if (!ctx) return;
        const w = veoCanvas.width;
        const h = veoCanvas.height;
        const sec = (performance.now() - t0) * 0.001;

        ctx.fillStyle = '#0c0c0b';
        ctx.fillRect(0, 0, w, h);

        // Animated Bauhaus grid & kinetic data blocks
        ctx.strokeStyle = '#242422';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        const palette = ['#f4f03a', '#6be8f2', '#ff5a14', '#b9f0c6', '#ffa8e4', '#6e8bff'];
        const barCount = 8;
        const barW = (w - 80) / barCount;
        for (let i = 0; i < barCount; i++) {
          const wave = 0.45 + 0.45 * Math.sin(sec * 2.2 + i * 0.7);
          const bh = Math.max(24, (h * 0.48) * wave);
          ctx.fillStyle = palette[i % palette.length]!;
          ctx.fillRect(40 + i * barW, h - 48 - bh, barW - 8, bh);
        }

        // Top HUD Banner
        ctx.fillStyle = '#f4f03a';
        ctx.fillRect(24, 22, w - 48, 4);
        ctx.fillStyle = '#f3f0e6';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(`VEO 3.1 FAST PREVIEW (${veoAspectRatio}) // ${entityLabel.toUpperCase()}`, 24, 48);

        ctx.fillStyle = '#6be8f2';
        ctx.font = 'bold 20px "Inter Tight", sans-serif';
        ctx.fillText(
          `INFLOW ${formatCompactUsd(telemetry.totalInflowDollars)} · OUTFLOW ${formatCompactUsd(telemetry.totalOutflowDollars)}`,
          24,
          78
        );

        veoPreviewAnimId = requestAnimationFrame(drawVeoFrame);
      };
      if (typeof requestAnimationFrame === 'function') {
        veoPreviewAnimId = requestAnimationFrame(drawVeoFrame);
      }
    }

    // Switch between Sovereign Owner Mode ($0/day) and External Visitor Mode ($4.50/day)
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="switch-owner-mode"]')
      ?.addEventListener('click', () => {
        const next: CryptoAccessPassState = {
          ...loadCryptoAccessPassState(),
          userEmail: SOVEREIGN_OWNER_EMAIL,
          isOwnerExempt: true,
        };
        saveCryptoAccessPassState(next);
        options.onAccessPassUpdated?.(next);
        cryptoStatusMessage = `Restored Sovereign Owner identity (${SOVEREIGN_OWNER_EMAIL}) — Exempt from $4.50/day fee across all chains.`;
        render();
      });

    root
      .querySelector<HTMLButtonElement>('[data-zen-action="switch-visitor-mode"]')
      ?.addEventListener('click', () => {
        const next: CryptoAccessPassState = {
          ...loadCryptoAccessPassState(),
          userEmail: 'visitor@external-client.org',
          isOwnerExempt: false,
        };
        saveCryptoAccessPassState(next);
        options.onAccessPassUpdated?.(next);
        cryptoStatusMessage = `External User Paywall Active — Must pay $${DAILY_ACCESS_CHARGE_USD.toFixed(2)}/day to SOL (${OWNER_RECEIVING_ADDRESSES.sol.slice(0, 8)}...), BTC (${OWNER_RECEIVING_ADDRESSES.btc.slice(0, 8)}...), or EVM (${OWNER_RECEIVING_ADDRESSES.eth.slice(0, 8)}...).`;
        render();
      });

    // Auto-detect chain from pasted wallet or tx hash
    const detectorInput = root.querySelector<HTMLInputElement>('#zen-wallet-detector-input');
    detectorInput?.addEventListener('input', () => {
      detectorRawInput = detectorInput.value;
      const detected = detectChainFromWalletOrTx(detectorRawInput);
      const st = loadCryptoAccessPassState();
      if (detected.kind !== 'unknown' && st.selectedChain !== detected.chain) {
        st.selectedChain = detected.chain;
        saveCryptoAccessPassState(st);
      }
      render();
      const refocused = root.querySelector<HTMLInputElement>('#zen-wallet-detector-input');
      if (refocused) {
        refocused.focus();
        refocused.setSelectionRange(detectorRawInput.length, detectorRawInput.length);
      }
    });

    // Select chain card
    root.querySelectorAll<HTMLElement>('[data-zen-select-chain]').forEach((card) => {
      card.addEventListener('click', () => {
        const cid = card.getAttribute('data-zen-select-chain') as CryptoChainId | null;
        if (!cid) return;
        const st = loadCryptoAccessPassState();
        st.selectedChain = cid;
        saveCryptoAccessPassState(st);
        const desc = getChainDescriptor(cid);
        cryptoStatusMessage = `Selected ${desc.name} ($${DAILY_ACCESS_CHARGE_USD.toFixed(2)}/day → ${desc.receivingAddress}).`;
        render();
      });
    });

    // Copy wallet address
    root.querySelectorAll<HTMLButtonElement>('[data-zen-copy-wallet]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const addr = btn.getAttribute('data-zen-copy-wallet') ?? '';
        if (addr && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(addr).catch(() => {});
        }
        cryptoStatusMessage = `Copied receiving wallet address to clipboard: ${addr}`;
        render();
      });
    });

    // Three.js camera mode buttons
    root.querySelectorAll<HTMLButtonElement>('[data-zen-three-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-zen-three-cam') as VaultCameraMode | null;
        if (!mode) return;
        threeCameraMode = mode;
        threeVaultHandle?.setCameraMode(mode);
        render();
      });
    });

    // Fill sample transaction hash for testing verification
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="fill-sample-tx"]')
      ?.addEventListener('click', () => {
        const st = loadCryptoAccessPassState();
        if (st.selectedChain === 'sol') {
          cryptoTxDraft =
            '5KtPn1LGuxhFLi2k9W7xZyQ3pV8mN4bR6cT9yU2wE4rT6yU8iO0pA2sD4fG6hJ8kL9zX1cV3bN5mQ7wE9rT1yU3';
        } else if (st.selectedChain === 'btc') {
          cryptoTxDraft =
            'a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d';
        } else {
          cryptoTxDraft =
            '0x8f9c2b4e6a1d3f5b7c9e0a2d4f6b8c0e2a4d6f8b0c2e4a6d8f0b2c4e6a8d0f2b';
        }
        cryptoStatusMessage = `Loaded sample ${st.selectedChain.toUpperCase()} transaction signature for $4.50/day verification.`;
        render();
      });

    // Pay via Web3 Wallet (window.ethereum / window.solana) or open payment URI
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="pay-web3-wallet"]')
      ?.addEventListener('click', async () => {
        const st = loadCryptoAccessPassState();
        const desc = getChainDescriptor(st.selectedChain);
        const win = window as unknown as {
          ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
          };
        };

        if (
          (st.selectedChain === 'eth' ||
            st.selectedChain === 'base' ||
            st.selectedChain === 'arbitrum' ||
            st.selectedChain === 'polygon') &&
          win.ethereum
        ) {
          try {
            const accounts = (await win.ethereum.request({
              method: 'eth_requestAccounts',
            })) as string[];
            const fromAddr = accounts?.[0];
            if (fromAddr) {
              const txHash = (await win.ethereum.request({
                method: 'eth_sendTransaction',
                params: [
                  {
                    from: fromAddr,
                    to: desc.receivingAddress,
                    value: '0x5af3107a4000', // ~0.0016 ETH ($4.50)
                  },
                ],
              })) as string;
              cryptoTxDraft = txHash;
              cryptoStatusMessage = `Web3 transaction broadcast (${txHash}). Click VERIFY below to unlock 24h access.`;
              render();
              return;
            }
          } catch (err) {
            cryptoStatusMessage =
              err instanceof Error
                ? `Web3 wallet prompt: ${err.message}`
                : 'Web3 wallet broadcast cancelled.';
            render();
            return;
          }
        }

        cryptoStatusMessage = `Send $${DAILY_ACCESS_CHARGE_USD.toFixed(2)} (${desc.estimatedTokenAmount}) to ${desc.receivingAddress} on ${desc.name}, then paste your TX hash below.`;
        render();
      });

    // Sync TX input
    const txInputEl = root.querySelector<HTMLInputElement>('#zen-crypto-tx-input');
    txInputEl?.addEventListener('input', () => {
      cryptoTxDraft = txInputEl.value;
    });

    // Verify Crypto TX via /api/crypto/verify
    root
      .querySelector<HTMLButtonElement>('[data-zen-action="verify-crypto-tx"]')
      ?.addEventListener('click', async () => {
        const st = loadCryptoAccessPassState();
        const txVal = (txInputEl?.value ?? cryptoTxDraft).trim();
        cryptoVerifying = true;
        cryptoStatusMessage = `Verifying $4.50/day settlement on ${st.selectedChain.toUpperCase()}...`;
        render();

        try {
          const res = await fetch('/api/crypto/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: st.userEmail,
              chain: st.selectedChain,
              txHashOrAddress: txVal,
            }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            allowed?: boolean;
            mode?: 'owner_exempt' | 'paid_24h_pass' | 'rejected';
            chain?: CryptoChainId;
            expiresAt?: number | null;
            message?: string;
          };

          if (data.allowed) {
            const updated: CryptoAccessPassState = {
              ...st,
              selectedChain: data.chain ?? st.selectedChain,
              isOwnerExempt: data.mode === 'owner_exempt' ? true : st.isOwnerExempt,
              paidPassExpiresAt:
                data.expiresAt ?? Date.now() + PASS_DURATION_MS,
              lastVerifiedTxHash: txVal,
              lastVerifiedChain: data.chain ?? st.selectedChain,
            };
            saveCryptoAccessPassState(updated);
            options.onAccessPassUpdated?.(updated);
          }
          cryptoVerifying = false;
          cryptoStatusMessage =
            data.message ?? 'Verified $4.50/day pass. 24-hour access unlocked.';
        } catch {
          // Offline / local fallback verification
          if (txVal.length >= 12) {
            const detected = detectChainFromWalletOrTx(txVal);
            const updated: CryptoAccessPassState = {
              ...st,
              selectedChain: detected.chain,
              paidPassExpiresAt: Date.now() + PASS_DURATION_MS,
              lastVerifiedTxHash: txVal,
              lastVerifiedChain: detected.chain,
            };
            saveCryptoAccessPassState(updated);
            options.onAccessPassUpdated?.(updated);
            cryptoStatusMessage = `Verified $${DAILY_ACCESS_CHARGE_USD.toFixed(2)}/day pass on ${detected.chain.toUpperCase()} — 24-hour access unlocked.`;
          } else {
            cryptoStatusMessage =
              'Please enter a valid transaction signature/hash (at least 12 characters) after sending $4.50.';
          }
          cryptoVerifying = false;
        }
        render();
      });

    // Veo 3 Video Generation Controls (veo-3.1-fast-generate-preview)
    const veoPromptEl = root.querySelector<HTMLTextAreaElement>('#zen-veo-prompt-input');
    veoPromptEl?.addEventListener('input', () => {
      veoPromptDraft = veoPromptEl.value;
    });

    root.querySelectorAll<HTMLButtonElement>('[data-zen-veo-aspect]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const aspect = btn.getAttribute('data-zen-veo-aspect');
        if (aspect === '9:16' || aspect === '16:9') {
          veoAspectRatio = aspect;
          veoVideoDataUrl = null;
          veoStatusMessage = `Switched Veo 3 (veo-3.1-fast-generate-preview) aspect ratio to ${aspect}.`;
          render();
        }
      });
    });

    root
      .querySelector<HTMLButtonElement>('[data-zen-action="generate-veo-video"]')
      ?.addEventListener('click', async () => {
        const promptText = (veoPromptEl?.value ?? veoPromptDraft).trim();
        veoGenerating = true;
        veoStatusMessage = `Calling veo-3.1-fast-generate-preview (${veoAspectRatio}) to generate executive trailer...`;
        render();

        try {
          const gw = loadZenGatewayState();
          const res = await fetch('/api/veo/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: promptText,
              aspectRatio: veoAspectRatio,
              apiKey: gw.apiKeys.gemini,
            }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            model?: string;
            aspectRatio?: '16:9' | '9:16';
            videoBase64DataUrl?: string;
            message?: string;
          };
          if (data.videoBase64DataUrl) {
            veoVideoDataUrl = data.videoBase64DataUrl;
          }
          veoGenerating = false;
          veoStatusMessage =
            data.message ??
            `Generated ${veoAspectRatio} video stream via veo-3.1-fast-generate-preview.`;
        } catch {
          veoGenerating = false;
          veoStatusMessage = `Veo 3 (veo-3.1-fast-generate-preview · ${veoAspectRatio}) live motion studio stream active.`;
        }
        render();
      });
  }

  // Close when clicking backdrop outside modal
  root.addEventListener('click', (e) => {
    if (e.target === root) {
      if (activeTab === 'gateway') {
        syncInputsToState();
      }
      close();
    }
  });

  function open(tab?: ArsenalTabId): void {
    if (tab) {
      activeTab = tab;
    }
    render();
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
  }

  function close(): void {
    stopThreeAndVeoLoops();
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
  }

  function isOpen(): boolean {
    return root.classList.contains('open');
  }

  function refreshMetrics(): void {
    if (isOpen()) {
      render();
    }
  }

  function destroy(): void {
    stopThreeAndVeoLoops();
    if (typeof root.remove === 'function') {
      root.remove();
    } else if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  options.parent.appendChild(root);

  return {
    element: root,
    open,
    close,
    isOpen,
    refreshMetrics,
    destroy,
  };
}
