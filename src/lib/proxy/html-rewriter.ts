/**
 * Reno Hub Reverse Proxy — Streaming HTML Rewriter (TransformStream)
 *
 * Rewrites HTML content on-the-fly using Web Streams API TransformStream,
 * achieving:
 * - Near-zero memory overhead (processes chunks, not entire documents)
 * - Faster TTFB (first bytes sent to client before full document is received)
 * - Robust chunk-boundary safety (handles both tags AND URLs split across chunks)
 *
 * The rewriter performs:
 * 1. Absolute URL rewriting (upstream base → proxy prefix)
 * 2. Root-relative path rewriting (/wp-admin/ → /api/proxy/{id}/wp-admin/)
 * 3. <head> injection (base tag, bridge script, sentinel CSS)
 * 4. <body> injection (proxy banner)
 * 5. Escaped URL rewriting (for inline JS/JSON strings)
 */

import {
  generateBridgeScript,
  generateSentinelCSS,
  generateProxyBanner,
  generateBaseTag,
} from "./bridge-injector";
import { isAdminPath } from "./url-resolver";

interface RewriterOptions {
  projectId: string;
  proxyPrefix: string;
  baseUrl: string;
  cleanSubpath: string;
}

/**
 * Minimum number of bytes to hold back at the end of each chunk to prevent
 * URL/tag splits across chunk boundaries. This must be longer than the
 * longest possible URL we need to match + some margin.
 *
 * The upstream baseUrl can be up to ~100 chars. We hold back 512 bytes
 * for safety — this covers any URL or tag that could span a chunk boundary.
 */
const HOLDBACK_SIZE = 512;

/**
 * Perform all URL rewrites on a complete text buffer.
 * Extracted to avoid code duplication between streaming and buffered modes.
 */
function rewriteURLs(
  text: string,
  baseRegex: RegExp,
  proxyPrefix: string,
  projectId: string,
  escapedBaseSlashed: string,
  escapedProxySlashed: string
): string {
  // 1. Rewrite absolute base URLs to proxy route
  let modified = text.replace(baseRegex, proxyPrefix);

  // 2. Rewrite escaped/JSON base URLs (e.g. https:\/\/client-site.com)
  modified = modified.replaceAll(escapedBaseSlashed, escapedProxySlashed);

  // 3. Rewrite root-relative WordPress paths in HTML attributes
  modified = modified
    .replace(
      /href=["']\/wp-admin\/?([^"']*)["']/g,
      `href="${proxyPrefix}/wp-admin/$1"`
    )
    .replace(
      /action=["']\/wp-admin\/?([^"']*)["']/g,
      `action="${proxyPrefix}/wp-admin/$1"`
    )
    .replace(
      /src=["']\/wp-includes\/([^"']*)["']/g,
      `src="${proxyPrefix}/wp-includes/$1"`
    )
    .replace(
      /href=["']\/wp-includes\/([^"']*)["']/g,
      `href="${proxyPrefix}/wp-includes/$1"`
    )
    .replace(
      /src=["']\/wp-content\/([^"']*)["']/g,
      `src="${proxyPrefix}/wp-content/$1"`
    )
    .replace(
      /href=["']\/wp-content\/([^"']*)["']/g,
      `href="${proxyPrefix}/wp-content/$1"`
    )
    .replace(
      /href=["']\/wp-json\/?([^"']*)["']/g,
      `href="${proxyPrefix}/wp-json/$1"`
    )
    .replace(
      /action=["']\/wp-json\/?([^"']*)["']/g,
      `action="${proxyPrefix}/wp-json/$1"`
    );

  // 4. Rewrite inline AJAX URL references
  modified = modified
    .replaceAll(
      '"/wp-admin/admin-ajax.php"',
      `"${proxyPrefix}/wp-admin/admin-ajax.php"`
    )
    .replaceAll(
      "'/wp-admin/admin-ajax.php'",
      `'${proxyPrefix}/wp-admin/admin-ajax.php'`
    )
    .replaceAll(
      '"\\/wp-admin\\/admin-ajax.php"',
      `"\\/api\\/proxy\\/${projectId}\\/wp-admin\\/admin-ajax.php"`
    );

  return modified;
}

/**
 * Creates a TransformStream that rewrites HTML content on-the-fly.
 *
 * Chunk-boundary safety strategy:
 * We hold back the last HOLDBACK_SIZE bytes of every chunk. This ensures:
 * - HTML tags split across chunks (e.g. `<scri` | `pt>`) are reassembled
 * - URLs split across chunks (e.g. `https://gaming` | `pcdiscount.com`) are reassembled
 * - Quoted attribute values split across chunks are reassembled
 *
 * The holdback bytes are prepended to the next chunk for processing.
 */
export function createHTMLRewriteStream(
  options: RewriterOptions
): TransformStream<Uint8Array, Uint8Array> {
  const { projectId, proxyPrefix, baseUrl, cleanSubpath } = options;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Pre-compile regex patterns for performance (created once, reused per chunk)
  const escapedBase = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const baseRegex = new RegExp(escapedBase, "g");
  const escapedBaseSlashed = baseUrl.replace(/\//g, "\\/");
  const escapedProxySlashed = proxyPrefix.replace(/\//g, "\\/");

  // State tracking across chunks
  let holdback = "";
  let headInjected = false;
  let bodyInjected = false;
  let fullHtmlAccumulator = ""; // Accumulate enough for builder detection

  // Injection content (generated eagerly on first chunk)
  let injections: {
    bridgeScript: string;
    sentinelCSS: string;
    proxyBanner: string;
    baseTag: string;
  } | null = null;

  const isInAdmin = isAdminPath(cleanSubpath);

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Prepend holdback from previous chunk
      const text = holdback + decoder.decode(chunk, { stream: true });
      holdback = "";

      // Accumulate HTML for builder detection (first ~16KB)
      if (fullHtmlAccumulator.length < 16384) {
        fullHtmlAccumulator += text;
      }

      // Generate injection content EAGERLY on first chunk
      if (!injections) {
        injections = {
          bridgeScript: generateBridgeScript(proxyPrefix, fullHtmlAccumulator),
          sentinelCSS: generateSentinelCSS(),
          proxyBanner: generateProxyBanner(),
          baseTag: generateBaseTag(proxyPrefix, isInAdmin),
        };
      }

      // ── Split: safe-to-emit vs holdback ────────────────────────────────
      // Hold back the last HOLDBACK_SIZE chars to prevent chunk-boundary
      // corruption of URLs, tags, and attribute values.
      let processable: string;
      if (text.length > HOLDBACK_SIZE) {
        processable = text.slice(0, text.length - HOLDBACK_SIZE);
        holdback = text.slice(text.length - HOLDBACK_SIZE);
      } else {
        // Chunk is smaller than holdback size — hold everything for next chunk
        holdback = text;
        return;
      }

      // ── URL Rewriting ───────────────────────────────────────────────────
      let modified = rewriteURLs(
        processable,
        baseRegex,
        proxyPrefix,
        projectId,
        escapedBaseSlashed,
        escapedProxySlashed
      );

      // ── Injection into <head> (once) ──────────────────────────────────
      if (!headInjected && injections) {
        const headMatch = modified.match(/<head[^>]*>/i);
        if (headMatch) {
          const idx = modified.indexOf(headMatch[0]) + headMatch[0].length;
          modified =
            modified.slice(0, idx) +
            injections.baseTag +
            injections.bridgeScript +
            injections.sentinelCSS +
            modified.slice(idx);
          headInjected = true;
        }
      }

      // ── Injection into <body> (once) ──────────────────────────────────
      if (!bodyInjected && injections) {
        const bodyMatch = modified.match(/<body[^>]*>/i);
        if (bodyMatch) {
          const idx = modified.indexOf(bodyMatch[0]) + bodyMatch[0].length;
          modified =
            modified.slice(0, idx) +
            injections.proxyBanner +
            modified.slice(idx);
          bodyInjected = true;
        }
      }

      controller.enqueue(encoder.encode(modified));
    },

    flush(controller) {
      // Process any remaining holdback content
      if (holdback.length > 0) {
        let remaining = rewriteURLs(
          holdback,
          baseRegex,
          proxyPrefix,
          projectId,
          escapedBaseSlashed,
          escapedProxySlashed
        );

        // If we never injected head/body content (tiny HTML), do it now
        if (!headInjected && injections) {
          const headMatch = remaining.match(/<head[^>]*>/i);
          if (headMatch) {
            const idx = remaining.indexOf(headMatch[0]) + headMatch[0].length;
            remaining =
              remaining.slice(0, idx) +
              injections.baseTag +
              injections.bridgeScript +
              injections.sentinelCSS +
              remaining.slice(idx);
          }
        }

        if (!bodyInjected && injections) {
          const bodyMatch = remaining.match(/<body[^>]*>/i);
          if (bodyMatch) {
            const idx = remaining.indexOf(bodyMatch[0]) + bodyMatch[0].length;
            remaining =
              remaining.slice(0, idx) +
              injections.proxyBanner +
              remaining.slice(idx);
          }
        }

        controller.enqueue(encoder.encode(remaining));
      }
    },
  });
}

/**
 * Fallback: Buffer-and-rewrite for edge cases where streaming isn't possible
 * (e.g., very small HTML fragments, error pages).
 *
 * This uses the same rewriting logic but buffers the entire response first.
 */
export async function rewriteHTMLBuffered(
  html: string,
  options: RewriterOptions
): Promise<string> {
  const { projectId, proxyPrefix, baseUrl, cleanSubpath } = options;
  const isInAdmin = isAdminPath(cleanSubpath);

  // URL Rewriting
  const escapedBase = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const baseRegex = new RegExp(escapedBase, "g");
  const escapedBaseSlashed = baseUrl.replace(/\//g, "\\/");
  const escapedProxySlashed = proxyPrefix.replace(/\//g, "\\/");

  let modified = rewriteURLs(
    html,
    baseRegex,
    proxyPrefix,
    projectId,
    escapedBaseSlashed,
    escapedProxySlashed
  );

  // Injections
  const bridgeScript = generateBridgeScript(proxyPrefix, modified);
  const sentinelCSS = generateSentinelCSS();
  const proxyBanner = generateProxyBanner();
  const baseTag = generateBaseTag(proxyPrefix, isInAdmin);

  // Inject into <head>
  if (modified.includes("<head>")) {
    modified = modified.replace("<head>", `<head>${baseTag}${bridgeScript}${sentinelCSS}`);
  } else if (modified.includes("<head ")) {
    modified = modified.replace(/<head([^>]*)>/, `<head$1>${baseTag}${bridgeScript}${sentinelCSS}`);
  } else {
    modified = baseTag + bridgeScript + sentinelCSS + modified;
  }

  // Inject banner into <body>
  if (modified.includes("<body")) {
    modified = modified.replace(/<body([^>]*)>/, `<body$1>${proxyBanner}`);
  } else {
    modified = proxyBanner + modified;
  }

  return modified;
}
