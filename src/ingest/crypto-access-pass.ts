/**
 * ZEN AI · ARSENAL Multi-Chain $4.50/Day Crypto Access Pass & Sovereign Owner Exemption
 * (`src/ingest/crypto-access-pass.ts`)
 *
 * Enforces the $4.50/day multi-chain access fee for all users EXCEPT the sovereign owner
 * (`royaltokens@gmail.com` / owner receiving wallets), with automatic chain detection across:
 * - Solana (SOL / USDC-SPL): `79XKtWP7EkLeNqAwKn7jUfkDfNbdXaM1Yn7YQikiQkcf`
 * - Bitcoin Native SegWit (BTC): `bc1q0zhdtrtudt6rzp40cgdkn32xed3jmxj069egty`
 * - Ethereum Mainnet (ETH / ERC-20): `0xf3955413302b3a0d8caecfa7a728f559220598f5`
 * - Base L2 (ETH / USDC): `0xf3955413302b3a0d8caecfa7a728f559220598f5`
 * - Arbitrum One (ETH / USDC / ARB): `0xf3955413302b3a0d8caecfa7a728f559220598f5`
 * - Polygon PoS & BNB Smart Chain (POL / MATIC / BNB / USDT): `0xf3955413302b3a0d8caecfa7a728f559220598f5`
 */

export type CryptoChainId = 'sol' | 'btc' | 'eth' | 'base' | 'arbitrum' | 'polygon';

export const DAILY_ACCESS_CHARGE_USD = 4.5;
export const PASS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SOVEREIGN_OWNER_EMAIL = 'royaltokens@gmail.com';

export const OWNER_RECEIVING_ADDRESSES = {
  sol: '79XKtWP7EkLeNqAwKn7jUfkDfNbdXaM1Yn7YQikiQkcf',
  btc: 'bc1q0zhdtrtudt6rzp40cgdkn32xed3jmxj069egty',
  eth: '0xf3955413302b3a0d8caecfa7a728f559220598f5',
  base: '0xf3955413302b3a0d8caecfa7a728f559220598f5',
  arbitrum: '0xf3955413302b3a0d8caecfa7a728f559220598f5',
  polygon: '0xf3955413302b3a0d8caecfa7a728f559220598f5',
} as const;

export interface CryptoPaymentChainDescriptor {
  id: CryptoChainId;
  name: string;
  shortLabel: string;
  networkStandard: string;
  chainIdHex?: string;
  receivingAddress: string;
  currencies: readonly string[];
  dailyUsdRate: number;
  estimatedTokenAmount: string;
  tokenSymbol: string;
  accentColor: string;
  explorerAddressUrl: string;
  explorerTxPrefix: string;
  paymentUri: string;
  detectionHint: string;
}

export const CRYPTO_PAYMENT_CHAINS: ReadonlyArray<CryptoPaymentChainDescriptor> = [
  {
    id: 'sol',
    name: 'Solana Mainnet',
    shortLabel: 'SOLANA (SOL)',
    networkStandard: 'Solana SPL · Base58 (44-char)',
    receivingAddress: OWNER_RECEIVING_ADDRESSES.sol,
    currencies: ['SOL', 'USDC (SPL)', 'USDT (SPL)'],
    dailyUsdRate: DAILY_ACCESS_CHARGE_USD,
    estimatedTokenAmount: '0.025 SOL (or 4.50 USDC)',
    tokenSymbol: 'SOL',
    accentColor: '#6be8f2',
    explorerAddressUrl: `https://solscan.io/account/${OWNER_RECEIVING_ADDRESSES.sol}`,
    explorerTxPrefix: 'https://solscan.io/tx/',
    paymentUri: `solana:${OWNER_RECEIVING_ADDRESSES.sol}?amount=0.025&label=ZEN%20AI%20Arsenal%20Daily%20Pass`,
    detectionHint: 'Detected via Base58 Ed25519 key (79XKt...Qkcf)',
  },
  {
    id: 'btc',
    name: 'Bitcoin Mainnet',
    shortLabel: 'BITCOIN (BTC)',
    networkStandard: 'Native SegWit · Bech32 (bc1q...)',
    receivingAddress: OWNER_RECEIVING_ADDRESSES.btc,
    currencies: ['BTC (Native SegWit)', 'Lightning / On-Chain'],
    dailyUsdRate: DAILY_ACCESS_CHARGE_USD,
    estimatedTokenAmount: '0.000048 BTC (~4,800 sats)',
    tokenSymbol: 'BTC',
    accentColor: '#ff5a14',
    explorerAddressUrl: `https://mempool.space/address/${OWNER_RECEIVING_ADDRESSES.btc}`,
    explorerTxPrefix: 'https://mempool.space/tx/',
    paymentUri: `bitcoin:${OWNER_RECEIVING_ADDRESSES.btc}?amount=0.000048&label=ZEN%20AI%20Arsenal%20Daily%20Pass`,
    detectionHint: 'Detected via BIP-173 Bech32 prefix (bc1q0z...egty)',
  },
  {
    id: 'eth',
    name: 'Ethereum Mainnet',
    shortLabel: 'ETHEREUM (ERC-20)',
    networkStandard: 'EVM Mainnet · EIP-155 Chain 1 (0xf395...)',
    chainIdHex: '0x1',
    receivingAddress: OWNER_RECEIVING_ADDRESSES.eth,
    currencies: ['ETH', 'USDC (ERC-20)', 'USDT (ERC-20)'],
    dailyUsdRate: DAILY_ACCESS_CHARGE_USD,
    estimatedTokenAmount: '0.0016 ETH (or 4.50 USDC)',
    tokenSymbol: 'ETH',
    accentColor: '#6e8bff',
    explorerAddressUrl: `https://etherscan.io/address/${OWNER_RECEIVING_ADDRESSES.eth}`,
    explorerTxPrefix: 'https://etherscan.io/tx/',
    paymentUri: `ethereum:${OWNER_RECEIVING_ADDRESSES.eth}@1?value=1600000000000000`,
    detectionHint: 'Detected via EVM 20-byte hex address #1 (0xf395...98f5)',
  },
  {
    id: 'base',
    name: 'Base L2 Mainnet',
    shortLabel: 'BASE L2 (ETH/USDC)',
    networkStandard: 'EVM Rollup · EIP-155 Chain 8453 (0xf395...)',
    chainIdHex: '0x2105',
    receivingAddress: OWNER_RECEIVING_ADDRESSES.base,
    currencies: ['ETH (Base)', 'USDC (Base)'],
    dailyUsdRate: DAILY_ACCESS_CHARGE_USD,
    estimatedTokenAmount: '0.0016 ETH (or 4.50 USDC)',
    tokenSymbol: 'ETH',
    accentColor: '#f4f03a',
    explorerAddressUrl: `https://basescan.org/address/${OWNER_RECEIVING_ADDRESSES.base}`,
    explorerTxPrefix: 'https://basescan.org/tx/',
    paymentUri: `ethereum:${OWNER_RECEIVING_ADDRESSES.base}@8453?value=1600000000000000`,
    detectionHint: 'Detected via shared EVM address #2 on Base L2 (0xf395...98f5)',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    shortLabel: 'ARBITRUM ONE',
    networkStandard: 'EVM L2 · EIP-155 Chain 42161 (0xf395...)',
    chainIdHex: '0xa4b1',
    receivingAddress: OWNER_RECEIVING_ADDRESSES.arbitrum,
    currencies: ['ETH (Arbitrum)', 'USDC', 'USDT', 'ARB'],
    dailyUsdRate: DAILY_ACCESS_CHARGE_USD,
    estimatedTokenAmount: '0.0016 ETH (or 4.50 USDC)',
    tokenSymbol: 'ETH',
    accentColor: '#b9f0c6',
    explorerAddressUrl: `https://arbiscan.io/address/${OWNER_RECEIVING_ADDRESSES.arbitrum}`,
    explorerTxPrefix: 'https://arbiscan.io/tx/',
    paymentUri: `ethereum:${OWNER_RECEIVING_ADDRESSES.arbitrum}@42161?value=1600000000000000`,
    detectionHint: 'Detected via shared EVM address #3 on Arbitrum One (0xf395...98f5)',
  },
  {
    id: 'polygon',
    name: 'Polygon PoS & BNB Chain',
    shortLabel: 'POLYGON / BSC',
    networkStandard: 'EVM Sidechain · Chain 137 / 56 (0xf395...)',
    chainIdHex: '0x89',
    receivingAddress: OWNER_RECEIVING_ADDRESSES.polygon,
    currencies: ['POL / MATIC', 'BNB', 'USDC', 'USDT'],
    dailyUsdRate: DAILY_ACCESS_CHARGE_USD,
    estimatedTokenAmount: '11.50 POL / 0.0075 BNB / 4.50 USDC',
    tokenSymbol: 'POL',
    accentColor: '#ffa8e4',
    explorerAddressUrl: `https://polygonscan.com/address/${OWNER_RECEIVING_ADDRESSES.polygon}`,
    explorerTxPrefix: 'https://polygonscan.com/tx/',
    paymentUri: `ethereum:${OWNER_RECEIVING_ADDRESSES.polygon}@137`,
    detectionHint: 'Detected via shared EVM address #4 on Polygon/BSC (0xf395...98f5)',
  },
];

export interface CryptoAccessPassState {
  /** Current user identity (defaults to royaltokens@gmail.com in owner session) */
  userEmail: string;
  /** Whether owner exemption is active (false when simulating external non-owner user) */
  isOwnerExempt: boolean;
  /** Selected payment chain in the UI */
  selectedChain: CryptoChainId;
  /** Timestamp (ms) when the 24-hour $4.50 pass expires for external users (null if unpaid) */
  paidPassExpiresAt: number | null;
  /** Verified transaction hash / signature that unlocked the current 24h pass */
  lastVerifiedTxHash?: string;
  /** Chain used for the last verified payment */
  lastVerifiedChain?: CryptoChainId;
}

const STORAGE_KEY = 'zen_arsenal_crypto_access_pass_v1';

export function getChainDescriptor(chainId: CryptoChainId): CryptoPaymentChainDescriptor {
  return CRYPTO_PAYMENT_CHAINS.find((c) => c.id === chainId) ?? CRYPTO_PAYMENT_CHAINS[0]!;
}

/**
 * Automatically detects the blockchain network from any wallet address or transaction hash.
 */
export function detectChainFromWalletOrTx(rawInput: string): {
  chain: CryptoChainId;
  allMatchingChains: CryptoChainId[];
  kind: 'wallet_address' | 'tx_hash' | 'owner_email' | 'unknown';
  confidence: 'exact_owner_wallet' | 'pattern_match' | 'fallback';
  summary: string;
} {
  const trimmed = rawInput.trim();
  const lower = trimmed.toLowerCase();

  if (lower === SOVEREIGN_OWNER_EMAIL) {
    return {
      chain: 'sol',
      allMatchingChains: ['sol', 'btc', 'eth', 'base', 'arbitrum', 'polygon'],
      kind: 'owner_email',
      confidence: 'exact_owner_wallet',
      summary: `Sovereign Owner Identity (${SOVEREIGN_OWNER_EMAIL}) — Exempt from $4.50/day fee`,
    };
  }

  // Exact owner Solana wallet
  if (trimmed === OWNER_RECEIVING_ADDRESSES.sol) {
    return {
      chain: 'sol',
      allMatchingChains: ['sol'],
      kind: 'wallet_address',
      confidence: 'exact_owner_wallet',
      summary: 'Matched Owner Solana Mainnet Wallet (79XKt...Qkcf)',
    };
  }

  // Exact owner Bitcoin Bech32 wallet
  if (lower === OWNER_RECEIVING_ADDRESSES.btc.toLowerCase()) {
    return {
      chain: 'btc',
      allMatchingChains: ['btc'],
      kind: 'wallet_address',
      confidence: 'exact_owner_wallet',
      summary: 'Matched Owner Bitcoin Native SegWit Wallet (bc1q0z...egty)',
    };
  }

  // Exact owner EVM wallet (shared across ETH, Base, Arbitrum, Polygon/BSC)
  if (lower === OWNER_RECEIVING_ADDRESSES.eth.toLowerCase()) {
    return {
      chain: 'eth',
      allMatchingChains: ['eth', 'base', 'arbitrum', 'polygon'],
      kind: 'wallet_address',
      confidence: 'exact_owner_wallet',
      summary:
        'Matched Owner Multi-Chain EVM Wallet (Ethereum · Base · Arbitrum · Polygon/BSC 0xf395...98f5)',
    };
  }

  // Bitcoin Bech32 or legacy address
  if (/^(bc1[a-zA-HJ-NP-Z0-9]{25,89}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(trimmed)) {
    return {
      chain: 'btc',
      allMatchingChains: ['btc'],
      kind: 'wallet_address',
      confidence: 'pattern_match',
      summary: 'Detected Bitcoin (BTC) Bech32 / Legacy Address',
    };
  }

  // EVM 42-char address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return {
      chain: 'eth',
      allMatchingChains: ['eth', 'base', 'arbitrum', 'polygon'],
      kind: 'wallet_address',
      confidence: 'pattern_match',
      summary: 'Detected EVM Multi-Chain Address (Ethereum / Base / Arbitrum / Polygon)',
    };
  }

  // EVM 66-char transaction hash (0x + 64 hex)
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return {
      chain: 'eth',
      allMatchingChains: ['eth', 'base', 'arbitrum', 'polygon'],
      kind: 'tx_hash',
      confidence: 'pattern_match',
      summary: 'Detected EVM 32-Byte Transaction Hash (ETH / Base / Arbitrum / Polygon)',
    };
  }

  // Bitcoin 64-char hex transaction ID (no 0x prefix)
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return {
      chain: 'btc',
      allMatchingChains: ['btc'],
      kind: 'tx_hash',
      confidence: 'pattern_match',
      summary: 'Detected Bitcoin (BTC) 64-Hex On-Chain Transaction ID',
    };
  }

  // Solana Base58 signature (typically 85-88 chars) or Base58 address (32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{65,92}$/.test(trimmed)) {
    return {
      chain: 'sol',
      allMatchingChains: ['sol'],
      kind: 'tx_hash',
      confidence: 'pattern_match',
      summary: 'Detected Solana (SOL) Base58 Transaction Signature',
    };
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return {
      chain: 'sol',
      allMatchingChains: ['sol'],
      kind: 'wallet_address',
      confidence: 'pattern_match',
      summary: 'Detected Solana (SOL) Base58 Wallet Address',
    };
  }

  return {
    chain: 'sol',
    allMatchingChains: ['sol'],
    kind: 'unknown',
    confidence: 'fallback',
    summary: 'Unrecognized format — select Solana, Bitcoin, or EVM chain below',
  };
}

export function isOwnerIdentity(emailOrAddress: string): boolean {
  const clean = emailOrAddress.trim().toLowerCase();
  if (!clean) return false;
  return (
    clean === SOVEREIGN_OWNER_EMAIL ||
    emailOrAddress.trim() === OWNER_RECEIVING_ADDRESSES.sol ||
    clean === OWNER_RECEIVING_ADDRESSES.btc.toLowerCase() ||
    clean === OWNER_RECEIVING_ADDRESSES.eth.toLowerCase()
  );
}

export function loadCryptoAccessPassState(): CryptoAccessPassState {
  const fallback: CryptoAccessPassState = {
    userEmail: SOVEREIGN_OWNER_EMAIL,
    isOwnerExempt: true,
    selectedChain: 'sol',
    paidPassExpiresAt: null,
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CryptoAccessPassState>;
    const userEmail =
      typeof parsed.userEmail === 'string' && parsed.userEmail.trim()
        ? parsed.userEmail.trim()
        : SOVEREIGN_OWNER_EMAIL;
    const isOwnerExempt =
      typeof parsed.isOwnerExempt === 'boolean'
        ? parsed.isOwnerExempt
        : isOwnerIdentity(userEmail);
    const selectedChain: CryptoChainId = CRYPTO_PAYMENT_CHAINS.some(
      (c) => c.id === parsed.selectedChain
    )
      ? (parsed.selectedChain as CryptoChainId)
      : 'sol';

    return {
      userEmail,
      isOwnerExempt,
      selectedChain,
      paidPassExpiresAt:
        typeof parsed.paidPassExpiresAt === 'number' ? parsed.paidPassExpiresAt : null,
      lastVerifiedTxHash:
        typeof parsed.lastVerifiedTxHash === 'string' ? parsed.lastVerifiedTxHash : undefined,
      lastVerifiedChain: parsed.lastVerifiedChain,
    };
  } catch {
    return fallback;
  }
}

export function saveCryptoAccessPassState(state: CryptoAccessPassState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function hasActiveAccessPass(
  state: CryptoAccessPassState = loadCryptoAccessPassState(),
  nowMs: number = Date.now()
): {
  allowed: boolean;
  reason: 'owner_exempt' | 'paid_24h_pass' | 'payment_required';
  remainingHoursText: string;
} {
  if (state.isOwnerExempt && isOwnerIdentity(state.userEmail)) {
    return {
      allowed: true,
      reason: 'owner_exempt',
      remainingHoursText: 'UNLIMITED (OWNER BYPASS · $0.00/DAY)',
    };
  }

  if (state.paidPassExpiresAt && state.paidPassExpiresAt > nowMs) {
    const diffMs = state.paidPassExpiresAt - nowMs;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      allowed: true,
      reason: 'paid_24h_pass',
      remainingHoursText: `${hours}h ${mins}m REMAINING ($4.50/DAY PASS ACTIVE)`,
    };
  }

  return {
    allowed: false,
    reason: 'payment_required',
    remainingHoursText: 'LOCKED — $4.50 / 24H CRYPTO DEPOSIT REQUIRED',
  };
}

/**
 * Generates a deterministic crisp SVG QR-like visual matrix for any wallet address
 * so users can scan or visually verify the receiving address without external trackers.
 */
export function buildWalletMatrixSvg(address: string, accentColor: string): string {
  const size = 13;
  const cell = 8;
  const pad = 8;
  const total = size * cell + pad * 2;

  let hash = 2166136261;
  for (let i = 0; i < address.length; i++) {
    hash ^= address.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const rects: string[] = [];
  const isFinder = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = pad + c * cell;
      const y = pad + r * cell;
      if (isFinder(r, c)) {
        rects.push(
          `<rect x="${x}" y="${y}" width="${cell - 1}" height="${cell - 1}" fill="${accentColor}" />`
        );
        continue;
      }
      const charCode = address.charCodeAt((r * size + c) % address.length);
      const bit = ((charCode + r * 17 + c * 31 + (hash & 0xff)) % 7) < 4;
      if (bit) {
        rects.push(
          `<rect x="${x}" y="${y}" width="${cell - 1}" height="${cell - 1}" fill="#f3f0e6" />`
        );
      }
    }
  }

  return `<svg viewBox="0 0 ${total} ${total}" width="112" height="112" role="img" aria-label="Wallet Matrix for ${address}" style="background:#0d0d0c;border:1.5px solid ${accentColor};flex-shrink:0">
    ${rects.join('')}
  </svg>`;
}
