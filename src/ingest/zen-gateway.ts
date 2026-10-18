/**
 * ZEN AI · ARSENAL Multi-Provider BYOK Gateway (`src/ingest/zen-gateway.ts`)
 *
 * Manages Bring-Your-Own-Key (BYOK) configuration, direct API key creation portals
 * (OpenRouter, Google AI Studio, Anthropic Console, OpenAI Platform, GroqCloud, DeepSeek),
 * model routing, and live gateway verification.
 */

import type { AIProviderId, AIProviderRuntimeConfig } from '../../contracts/index.js';

export interface ZenProviderModelOption {
  id: string;
  label: string;
  badge: string;
  contextWindow: string;
}

export interface ZenProviderDescriptor {
  id: AIProviderId;
  name: string;
  shortName: string;
  badge: string;
  tagline: string;
  accentColor: string;
  keyCreateUrl: string;
  keyCreateLabel: string;
  docsUrl: string;
  creditsUrl?: string;
  keyPlaceholder: string;
  defaultModel: string;
  models: readonly ZenProviderModelOption[];
}

export const ZEN_PROVIDERS: readonly ZenProviderDescriptor[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter Universal Gateway',
    shortName: 'OPENROUTER',
    badge: 'RECOMMENDED · 300+ MODELS',
    tagline:
      'One API key unlocks Claude 3.7 Sonnet, Gemini 2.5 Pro, OpenAI o3-mini, DeepSeek R1, and Llama 3.3 with automatic fallback.',
    accentColor: '#f4f03a',
    keyCreateUrl: 'https://openrouter.ai/keys',
    keyCreateLabel: 'Create OpenRouter Key ↗',
    docsUrl: 'https://openrouter.ai/models',
    creditsUrl: 'https://openrouter.ai/credits',
    keyPlaceholder: 'sk-or-v1-...',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    models: [
      {
        id: 'anthropic/claude-3.7-sonnet',
        label: 'Claude 3.7 Sonnet (via OpenRouter)',
        badge: 'EXECUTIVE NARRATIVE',
        contextWindow: '200K',
      },
      {
        id: 'google/gemini-2.5-pro',
        label: 'Gemini 2.5 Pro (via OpenRouter)',
        badge: '2M CONTEXT LEDGER',
        contextWindow: '2M',
      },
      {
        id: 'openai/o3-mini-high',
        label: 'OpenAI o3-mini High (via OpenRouter)',
        badge: 'QUANT REASONING',
        contextWindow: '200K',
      },
      {
        id: 'deepseek/deepseek-r1',
        label: 'DeepSeek R1 (via OpenRouter)',
        badge: 'FORENSIC AUDIT',
        contextWindow: '128K',
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B Instruct (via OpenRouter)',
        badge: 'FAST CATEGORIZATION',
        contextWindow: '128K',
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Google AI Studio · Gemini',
    shortName: 'GEMINI',
    badge: 'NATIVE MULTIMODAL + PYTHON',
    tagline:
      'Direct Google AI Studio gateway with native PDF/XLSX multimodal ingestion and Managed Agent Python code execution.',
    accentColor: '#6be8f2',
    keyCreateUrl: 'https://aistudio.google.com/app/apikey',
    keyCreateLabel: 'Get Gemini API Key ↗',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    keyPlaceholder: 'AIzaSy...',
    defaultModel: 'gemini-4-argon',
    models: [
      {
        id: 'gemini-4-argon',
        label: 'Gemini 4 Argon · Flagship Synthesis',
        badge: 'DEFAULT',
        contextWindow: '2M',
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro · Deep Multimodal Audit',
        badge: 'MULTIMODAL',
        contextWindow: '2M',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Console · Claude',
    shortName: 'ANTHROPIC',
    badge: 'EDITORIAL & FORENSIC',
    tagline:
      'Direct Anthropic API connection for institutional-grade CFO commentary, anomaly attribution, and boardroom prose.',
    accentColor: '#ffa8e4',
    keyCreateUrl: 'https://console.anthropic.com/settings/keys',
    keyCreateLabel: 'Create Anthropic Key ↗',
    docsUrl: 'https://docs.anthropic.com/en/api',
    keyPlaceholder: 'sk-ant-api03-...',
    defaultModel: 'claude-3-7-sonnet-20250219',
    models: [
      {
        id: 'claude-3-7-sonnet-20250219',
        label: 'Claude 3.7 Sonnet · Extended Thinking',
        badge: 'FLAGSHIP',
        contextWindow: '200K',
      },
      {
        id: 'claude-3-5-sonnet-latest',
        label: 'Claude 3.5 Sonnet · High Velocity',
        badge: 'FAST',
        contextWindow: '200K',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI Platform',
    shortName: 'OPENAI',
    badge: 'STRUCTURED JSON + O3',
    tagline:
      'Direct OpenAI API connection for strict JSON schema extraction, counterparty normalization, and o3-mini reasoning.',
    accentColor: '#b9f0c6',
    keyCreateUrl: 'https://platform.openai.com/api-keys',
    keyCreateLabel: 'Create OpenAI Key ↗',
    docsUrl: 'https://platform.openai.com/docs/models',
    keyPlaceholder: 'sk-proj-...',
    defaultModel: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        label: 'GPT-4o · Omni Financial Architect',
        badge: 'STRUCTURED',
        contextWindow: '128K',
      },
      {
        id: 'o3-mini',
        label: 'o3-mini · Quantitative Audit',
        badge: 'REASONING',
        contextWindow: '200K',
      },
    ],
  },
  {
    id: 'groq',
    name: 'GroqCloud LPU Inference',
    shortName: 'GROQ LPU',
    badge: 'SUB-100MS REALTIME',
    tagline:
      'Ultra-low-latency LPU hardware acceleration for instant natural-language Ask queries and real-time ledger filtering.',
    accentColor: '#ff5a14',
    keyCreateUrl: 'https://console.groq.com/keys',
    keyCreateLabel: 'Create GroqCloud Key ↗',
    docsUrl: 'https://console.groq.com/docs/models',
    keyPlaceholder: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B Versatile · 800 tok/s',
        badge: 'ULTRA FAST',
        contextWindow: '128K',
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        label: 'DeepSeek R1 Distill Llama 70B',
        badge: 'REASONING',
        contextWindow: '128K',
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Official API',
    shortName: 'DEEPSEEK',
    badge: 'QUANT & RECONCILIATION',
    tagline:
      'Direct DeepSeek V3 & R1 mathematical reasoning gateway for high-volume ledger classification and variance proofs.',
    accentColor: '#6e8bff',
    keyCreateUrl: 'https://platform.deepseek.com/api_keys',
    keyCreateLabel: 'Create DeepSeek Key ↗',
    docsUrl: 'https://api-docs.deepseek.com/',
    keyPlaceholder: 'sk-...',
    defaultModel: 'deepseek-chat',
    models: [
      {
        id: 'deepseek-chat',
        label: 'DeepSeek V3 · Ledger Architect',
        badge: 'DEFAULT',
        contextWindow: '64K',
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek R1 · Forensic Math Reasoner',
        badge: 'R1 AUDIT',
        contextWindow: '64K',
      },
    ],
  },
];

export interface ZenGatewayStoredState {
  activeProvider: AIProviderId;
  selectedModels: Record<AIProviderId, string>;
  apiKeys: Partial<Record<AIProviderId, string>>;
  customModelOverride?: string;
}

const STORAGE_KEY = 'zen_arsenal_gateway_v1';

const DEFAULT_STATE: ZenGatewayStoredState = {
  activeProvider: 'openrouter',
  selectedModels: {
    openrouter: 'anthropic/claude-3.7-sonnet',
    gemini: 'gemini-4-argon',
    anthropic: 'claude-3-7-sonnet-20250219',
    openai: 'gpt-4o',
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-chat',
  },
  apiKeys: {},
};

type GatewayListener = (state: ZenGatewayStoredState) => void;
const listeners = new Set<GatewayListener>();

export function loadZenGatewayState(): ZenGatewayStoredState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ZenGatewayStoredState>;
    const activeProvider = ZEN_PROVIDERS.some((p) => p.id === parsed.activeProvider)
      ? parsed.activeProvider!
      : 'openrouter';
    return {
      activeProvider,
      selectedModels: {
        ...DEFAULT_STATE.selectedModels,
        ...(parsed.selectedModels ?? {}),
      },
      apiKeys: {
        ...(parsed.apiKeys ?? {}),
      },
      customModelOverride:
        typeof parsed.customModelOverride === 'string' ? parsed.customModelOverride : undefined,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveZenGatewayState(next: ZenGatewayStoredState): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }
  for (const listener of listeners) {
    listener(next);
  }
}

export function subscribeZenGatewayState(listener: GatewayListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProviderDescriptor(id: AIProviderId): ZenProviderDescriptor {
  return ZEN_PROVIDERS.find((p) => p.id === id) ?? ZEN_PROVIDERS[0]!;
}

export function getActiveProviderRuntimeConfig(): AIProviderRuntimeConfig {
  const state = loadZenGatewayState();
  const provider = state.activeProvider;
  const apiKey = state.apiKeys[provider]?.trim() || undefined;
  const model =
    state.customModelOverride?.trim() ||
    state.selectedModels[provider] ||
    getProviderDescriptor(provider).defaultModel;

  // If the user hasn't entered a key for the selected non-gemini provider,
  // check if any provider has a user-entered key; otherwise default to gemini/server fallback
  if (!apiKey && provider !== 'gemini') {
    const configuredEntry = Object.entries(state.apiKeys).find(
      ([, k]) => typeof k === 'string' && k.trim().length > 0
    );
    if (configuredEntry) {
      const fallbackProvider = configuredEntry[0] as AIProviderId;
      return {
        provider: fallbackProvider,
        model: state.selectedModels[fallbackProvider],
        apiKey: configuredEntry[1]!.trim(),
      };
    }
  }

  return {
    provider,
    model,
    ...(apiKey ? { apiKey } : {}),
  };
}

export function getZenGatewayHeaders(): Record<string, string> {
  const cfg = getActiveProviderRuntimeConfig();
  const headers: Record<string, string> = {
    'X-Zen-Provider': cfg.provider,
  };
  if (cfg.model) {
    headers['X-Zen-Model'] = cfg.model;
  }
  if (cfg.apiKey) {
    headers['X-Zen-Api-Key'] = cfg.apiKey;
  }
  return headers;
}

export function hasAnyUserByokKey(state = loadZenGatewayState()): boolean {
  return Object.values(state.apiKeys).some((v) => typeof v === 'string' && v.trim().length > 4);
}
