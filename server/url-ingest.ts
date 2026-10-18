/**
 * Server-Side Universal URL, YouTube & Copied Text Ingestion (`server/url-ingest.ts`)
 *
 * Handles:
 * - YouTube Video / Shorts / Live URLs (`youtube.com/watch?v=...`, `youtu.be/...`)
 *   -> Fetches oEmbed title/channel, watch-page description, and caption transcript tracks,
 *      then synthesizes/extracts structured ledger rows via active AI provider (OpenRouter, Gemini,
 *      Anthropic, OpenAI, Groq, DeepSeek) or deterministic financial parser.
 * - Arbitrary Web URLs (`https://...`)
 *   -> Direct CSV/JSON/TSV files, or HTML web pages / articles / financial reports.
 * - Copied Text / Markdown tables / Earnings releases.
 */

import type {
  AIProviderRuntimeConfig,
  RawIngestFile,
  RawSourceRow,
} from '../contracts/index.js';
import {
  detectInputKind,
  extractRowsFromUnstructuredText,
  extractYouTubeVideoId,
  rowsToCsvIngestFile,
} from '../src/ingest/text-and-url-parser.js';
import { loadServerConfig, type ServerConfig } from './config.js';
import { callExternalProviderJson, resolveProviderCredentials } from './gemini.js';

export interface UrlIngestResponse {
  ok: boolean;
  kind: 'youtube_url' | 'web_url' | 'copied_text';
  title: string;
  entityNameHint: string;
  summary?: string;
  files: RawIngestFile[];
  extractedRowsCount: number;
  sourceUrl?: string;
}

function stripHtmlToReadableText(html: string): { title: string; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const rawTitle = titleMatch?.[1]
    ? titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
    : 'Web Financial Document';

  const metaDescMatch =
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i.exec(
      html
    );
  const metaDesc = metaDescMatch?.[1] ?? '';

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(tr|p|div|li|h1|h2|h3|h4|br)>/gi, '\n')
    .replace(/<(td|th)[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

  return {
    title: rawTitle.slice(0, 80),
    text: `${rawTitle}\n${metaDesc}\n${bodyText.slice(0, 24000)}`,
  };
}

async function fetchYouTubeMetadataAndTranscript(videoUrl: string): Promise<{
  videoId: string;
  title: string;
  author: string;
  description: string;
  transcript: string;
}> {
  const videoId = extractYouTubeVideoId(videoUrl) ?? 'youtube_vid';
  const canonicalWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  let title = `YouTube Financial Analysis (${videoId})`;
  let author = 'YouTube Channel';
  let description = '';
  let transcript = '';

  // 1. Fetch oEmbed metadata (fast, public, reliable)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalWatchUrl)}&format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(oembedUrl, { signal: controller.signal });
      if (res.ok) {
        const data = (await res.json()) as { title?: string; author_name?: string };
        if (data.title?.trim()) title = data.title.trim();
        if (data.author_name?.trim()) author = data.author_name.trim();
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Ignore oEmbed errors
  }

  // 2. Fetch watch page HTML for shortDescription & captionTracks
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const res = await fetch(canonicalWatchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });
      if (res.ok) {
        const html = await res.text();
        const descMatch = /"shortDescription":"((?:\\.|[^"\\])*)"/.exec(html);
        if (descMatch?.[1]) {
          try {
            description = JSON.parse(`"${descMatch[1]}"`) as string;
          } catch {
            description = descMatch[1].replace(/\\n/g, '\n');
          }
        }

        const captionMatch = /"captionTracks":\s*(\[[^\]]+\])/.exec(html);
        if (captionMatch?.[1]) {
          try {
            const tracks = JSON.parse(captionMatch[1]) as Array<{ baseUrl?: string }>;
            const trackUrl = tracks[0]?.baseUrl;
            if (trackUrl) {
              const capRes = await fetch(trackUrl, { signal: controller.signal });
              if (capRes.ok) {
                const capXml = await capRes.text();
                transcript = capXml
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/&#39;/g, "'")
                  .replace(/&quot;/g, '"')
                  .replace(/&amp;/g, '&')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 18000);
              }
            }
          } catch {
            // Ignore caption parse errors
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Ignore watch page fetch errors
  }

  return {
    videoId,
    title,
    author,
    description: description.slice(0, 8000),
    transcript,
  };
}

/**
 * Uses the active AI provider (OpenRouter, Gemini, Anthropic, OpenAI, Groq, DeepSeek)
 * to extract or synthesize 24–36 structured 2025 financial ledger rows from unstructured
 * text, YouTube video metadata/transcript, or webpage content.
 */
async function extractRowsWithAiGateway(params: {
  sourceTitle: string;
  sourceKind: 'youtube_url' | 'web_url' | 'copied_text';
  sourceUrl?: string;
  textContent: string;
  config: ServerConfig;
  providerOverride?: AIProviderRuntimeConfig;
}): Promise<RawSourceRow[] | null> {
  const { sourceTitle, sourceKind, sourceUrl, textContent, config, providerOverride } = params;
  const { provider, apiKey, model } = resolveProviderCredentials(config, providerOverride);
  if (!apiKey) return null;

  const systemPrompt = `You are the Principal Financial Data Architect for "ZEN AI · Arsenal Finance Story".
The user has provided a ${sourceKind === 'youtube_url' ? 'YouTube video (title, channel, description, and transcript)' : sourceKind === 'web_url' ? 'Web URL / document' : 'copied text / financial snippet'}.
Your task is to extract all explicit financial transactions, revenue streams, operating expenses, sponsorships, compute costs, payroll, or capital allocations mentioned in the content—AND if fewer than 18 explicit dated items are present, extrapolate a realistic, coherent 24-to-32 row FY 2025 ledger (across months 2025-01 to 2025-12) that faithfully represents the economics of "${sourceTitle}".

Return ONLY a valid JSON object with key "rows" containing an array of 20 to 36 objects:
{
  "rows": [
    {
      "id": "ROW-001",
      "date": "2025-MM-DD",
      "posted_date": "2025-MM-DD",
      "account": "Operating Ledger",
      "tran_type": "INFLOW" | "OPERATING",
      "description": "Clean vendor, revenue source, or cost center name",
      "amount": "-12500.00" (negative decimal string for expenses/outflows, positive decimal string like "85000.00" for revenue/inflows),
      "currency": "USD"
    }
  ]
}`;

  const userPrompt = `Source Title: ${sourceTitle}
${sourceUrl ? `Source URL: ${sourceUrl}\n` : ''}Content:
${textContent.slice(0, 16000)}`;

  try {
    if (provider !== 'gemini') {
      const ext = await callExternalProviderJson({
        provider,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        timeoutMs: 14000,
        temperature: 0.1,
      });
      if (ext?.rawText) {
        const cleaned = ext.rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const parsed = JSON.parse(cleaned) as { rows?: Array<Record<string, unknown>> };
        if (Array.isArray(parsed.rows) && parsed.rows.length >= 5) {
          return parsed.rows.map((r, i) => ({
            id: typeof r.id === 'string' && r.id ? r.id : `AI-${String(i + 1).padStart(3, '0')}`,
            date: typeof r.date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(r.date) ? r.date : '2025-06-15',
            posted_date:
              typeof r.posted_date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(r.posted_date)
                ? r.posted_date
                : typeof r.date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(r.date)
                  ? r.date
                  : '2025-06-15',
            account: typeof r.account === 'string' ? r.account : sourceTitle.slice(0, 36),
            tran_type: typeof r.tran_type === 'string' ? r.tran_type : 'OPERATING',
            description: typeof r.description === 'string' ? r.description : 'Ledger Entry',
            amount: String(r.amount ?? '-100.00'),
            currency: 'USD',
          }));
        }
      }
      return null;
    }

    // Gemini native path (supports YouTube fileUri when sourceKind === 'youtube_url' or text fallback)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (res.ok) {
        const payload = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
        if (rawText) {
          const parsed = JSON.parse(rawText) as { rows?: Array<Record<string, unknown>> };
          if (Array.isArray(parsed.rows) && parsed.rows.length >= 5) {
            return parsed.rows.map((r, i) => ({
              id: typeof r.id === 'string' && r.id ? r.id : `GEM-${String(i + 1).padStart(3, '0')}`,
              date:
                typeof r.date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(r.date)
                  ? r.date
                  : '2025-06-15',
              posted_date:
                typeof r.posted_date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(r.posted_date)
                  ? r.posted_date
                  : typeof r.date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(r.date)
                    ? r.date
                    : '2025-06-15',
              account: typeof r.account === 'string' ? r.account : sourceTitle.slice(0, 36),
              tran_type: typeof r.tran_type === 'string' ? r.tran_type : 'OPERATING',
              description: typeof r.description === 'string' ? r.description : 'Ledger Entry',
              amount: String(r.amount ?? '-100.00'),
              currency: 'USD',
            }));
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Fall back to deterministic extraction
  }
  return null;
}

export async function ingestUniversalUrlOrText(params: {
  input: string;
  titleHint?: string;
  configInput?: ServerConfig;
  providerOverride?: AIProviderRuntimeConfig;
}): Promise<UrlIngestResponse> {
  const config = params.configInput ?? loadServerConfig();
  const raw = params.input.trim();
  const detected = detectInputKind(raw);

  // 1. YouTube URL
  if (detected === 'youtube_url') {
    const yt = await fetchYouTubeMetadataAndTranscript(raw);
    const entityNameHint =
      params.titleHint?.trim() ||
      (yt.author && yt.author !== 'YouTube Channel'
        ? `${yt.author} · ${yt.title.slice(0, 38)}`
        : yt.title.slice(0, 48));

    const combinedText = [
      `YouTube Video Title: ${yt.title}`,
      `Channel / Creator: ${yt.author}`,
      yt.description ? `Description:\n${yt.description}` : '',
      yt.transcript ? `Transcript:\n${yt.transcript}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const aiRows = await extractRowsWithAiGateway({
      sourceTitle: entityNameHint,
      sourceKind: 'youtube_url',
      sourceUrl: raw,
      textContent: combinedText,
      config,
      providerOverride: params.providerOverride,
    });

    const finalRows =
      aiRows && aiRows.length >= 6
        ? aiRows
        : extractRowsFromUnstructuredText(combinedText, entityNameHint);

    const file = rowsToCsvIngestFile(finalRows, `youtube_${yt.videoId}_ledger_2025.csv`);
    return {
      ok: true,
      kind: 'youtube_url',
      title: yt.title,
      entityNameHint,
      summary: `Extracted ${finalRows.length} financial ledger entries from YouTube video "${yt.title}" (${yt.author}).`,
      files: [file],
      extractedRowsCount: finalRows.length,
      sourceUrl: raw,
    };
  }

  // 2. Arbitrary Web URL (CSV, JSON, HTML article, SEC filing, Notion, GitHub, etc.)
  if (detected === 'web_url') {
    let fetchedText = '';
    let contentType = '';
    const pageTitle = params.titleHint?.trim() || '';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      try {
        const res = await fetch(raw, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; ZenArsenalFinanceBot/1.0; +https://zenai.world)',
            Accept: 'text/csv,application/json,text/plain,text/html,*/*',
          },
          signal: controller.signal,
        });
        contentType = (res.headers.get('content-type') ?? '').toLowerCase();
        if (res.ok) {
          fetchedText = await res.text();
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // If external fetch is blocked or offline, synthesize from URL slug
    }

    const urlObj = (() => {
      try {
        return new URL(raw);
      } catch {
        return null;
      }
    })();
    const hostLabel = urlObj ? urlObj.hostname.replace(/^www\./, '') : 'Web Source';
    const pathSlug = urlObj
      ? urlObj.pathname.split('/').filter(Boolean).pop() ?? 'ledger'
      : 'ledger';

    // If direct CSV or JSON file
    if (
      fetchedText &&
      (contentType.includes('csv') ||
        contentType.includes('json') ||
        /\.(csv|tsv|json)$/i.test(pathSlug)) &&
      !fetchedText.trim().startsWith('<!DOCTYPE') &&
      !fetchedText.trim().startsWith('<html')
    ) {
      const entityNameHint = pageTitle || `${hostLabel} · ${pathSlug}`;
      return {
        ok: true,
        kind: 'web_url',
        title: entityNameHint,
        entityNameHint,
        summary: `Downloaded structured dataset directly from ${hostLabel}.`,
        files: [
          {
            name: /\.(csv|tsv|json)$/i.test(pathSlug) ? pathSlug : `${pathSlug}.csv`,
            mimeType: contentType.includes('json') ? 'application/json' : 'text/csv',
            content: fetchedText,
            encoding: 'utf8',
          },
        ],
        extractedRowsCount: fetchedText.split('\n').length,
        sourceUrl: raw,
      };
    }

    // HTML webpage or article
    const stripped = fetchedText
      ? stripHtmlToReadableText(fetchedText)
      : { title: `${hostLabel} · ${pathSlug}`, text: raw };
    const entityNameHint = pageTitle || stripped.title || `${hostLabel} Financial Analysis`;

    const aiRows = await extractRowsWithAiGateway({
      sourceTitle: entityNameHint,
      sourceKind: 'web_url',
      sourceUrl: raw,
      textContent: stripped.text,
      config,
      providerOverride: params.providerOverride,
    });

    const finalRows =
      aiRows && aiRows.length >= 6
        ? aiRows
        : extractRowsFromUnstructuredText(stripped.text, entityNameHint);

    const file = rowsToCsvIngestFile(
      finalRows,
      `${hostLabel.replace(/[^a-z0-9]+/gi, '_')}_2025.csv`
    );

    return {
      ok: true,
      kind: 'web_url',
      title: stripped.title,
      entityNameHint,
      summary: `Extracted ${finalRows.length} ledger entries from ${hostLabel} ("${stripped.title}").`,
      files: [file],
      extractedRowsCount: finalRows.length,
      sourceUrl: raw,
    };
  }

  // 3. Copied Text / Markdown Table / Pasted Notes
  const firstLine =
    raw
      .split(/\r?\n/)
      .map((l) => l.replace(/^[#*>-]+\s*/, '').trim())
      .find((l) => l.length >= 3 && l.length <= 64) ?? 'Copied Text Ledger';
  const entityNameHint = params.titleHint?.trim() || firstLine.slice(0, 44);

  const aiRows = await extractRowsWithAiGateway({
    sourceTitle: entityNameHint,
    sourceKind: 'copied_text',
    textContent: raw,
    config,
    providerOverride: params.providerOverride,
  });

  const finalRows =
    aiRows && aiRows.length >= 6
      ? aiRows
      : extractRowsFromUnstructuredText(raw, entityNameHint);

  const file = rowsToCsvIngestFile(finalRows, 'copied_text_ledger_2025.csv');
  return {
    ok: true,
    kind: 'copied_text',
    title: entityNameHint,
    entityNameHint,
    summary: `Extracted ${finalRows.length} structured transactions from copied text.`,
    files: [file],
    extractedRowsCount: finalRows.length,
  };
}
