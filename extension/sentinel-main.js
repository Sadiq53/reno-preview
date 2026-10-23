/**
 * Reno Access Companion - Main World Zero-Trust Capability Sentinel
 *
 * Injected into client WordPress Admin dashboards at document_start.
 * Operates directly in the page execution environment (MAIN world) to prevent
 * developers from extracting administrative credentials or email addresses via:
 * 1. DevTools Console commands ($0.getAttribute('value'), $0.value, $0.defaultValue, etc.)
 * 2. DevTools Elements attribute inspection (Attr.prototype, outerHTML, innerHTML reflection)
 * 3. Console fetch() or XMLHttpRequest calls against admin pages or REST APIs (/wp-json/...)
 * 4. DOM property reflection on HTMLInputElement.prototype and Attr.prototype
 */

(function () {
  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const MASKED_EMAIL = "••••••••@••••.com";

  function isEmailField(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag !== "input" && tag !== "textarea") return false;
    const id = (el.id || "").toLowerCase();
    const name = (el.name || "").toLowerCase();
    const type = (el.type || "").toLowerCase();
    return (
      id === "admin_email" ||
      id === "new_admin_email" ||
      name === "admin_email" ||
      name === "new_admin_email" ||
      type === "email" ||
      id.includes("email") ||
      name.includes("email")
    );
  }

  // 1. Prototype Guard on Element.prototype.getAttribute
  try {
    const origGetAttribute = Element.prototype.getAttribute;
    Element.prototype.getAttribute = function (attrName) {
      const val = origGetAttribute.apply(this, arguments);
      if (!val || typeof val !== "string") return val;

      if (isEmailField(this) && attrName && attrName.toLowerCase() === "value") {
        return MASKED_EMAIL;
      }

      if (EMAIL_REGEX.test(val)) {
        return val.replace(EMAIL_REGEX, MASKED_EMAIL);
      }
      return val;
    };
  } catch (e) {}

  // 2. Prototype Guard on Element.prototype.getAttributeNode
  try {
    const origGetAttributeNode = Element.prototype.getAttributeNode;
    Element.prototype.getAttributeNode = function (attrName) {
      const node = origGetAttributeNode.apply(this, arguments);
      if (!node) return node;

      if (isEmailField(this) && attrName && attrName.toLowerCase() === "value") {
        try {
          node.value = MASKED_EMAIL;
        } catch (e) {}
      } else if (node.value && EMAIL_REGEX.test(node.value)) {
        try {
          node.value = node.value.replace(EMAIL_REGEX, MASKED_EMAIL);
        } catch (e) {}
      }
      return node;
    };
  } catch (e) {}

  // 3. Prototype Guard on Attr.prototype.value and Attr.prototype.nodeValue
  try {
    const attrValueDesc = Object.getOwnPropertyDescriptor(Attr.prototype, "value");
    if (attrValueDesc && attrValueDesc.get) {
      const origAttrValGet = attrValueDesc.get;
      Object.defineProperty(Attr.prototype, "value", {
        get: function () {
          const val = origAttrValGet.call(this);
          if (typeof val === "string") {
            if (this.name === "value" && this.ownerElement && isEmailField(this.ownerElement)) {
              return MASKED_EMAIL;
            }
            if (EMAIL_REGEX.test(val)) {
              return val.replace(EMAIL_REGEX, MASKED_EMAIL);
            }
          }
          return val;
        },
        set: function (newVal) {
          if (this.name === "value" && this.ownerElement && isEmailField(this.ownerElement)) {
            return attrValueDesc.set ? attrValueDesc.set.call(this, MASKED_EMAIL) : MASKED_EMAIL;
          }
          return attrValueDesc.set ? attrValueDesc.set.call(this, newVal) : newVal;
        },
        configurable: true,
        enumerable: true,
      });
    }

    const attrNodeValDesc = Object.getOwnPropertyDescriptor(Attr.prototype, "nodeValue");
    if (attrNodeValDesc && attrNodeValDesc.get) {
      const origNodeValGet = attrNodeValDesc.get;
      Object.defineProperty(Attr.prototype, "nodeValue", {
        get: function () {
          const val = origNodeValGet.call(this);
          if (typeof val === "string") {
            if (this.name === "value" && this.ownerElement && isEmailField(this.ownerElement)) {
              return MASKED_EMAIL;
            }
            if (EMAIL_REGEX.test(val)) {
              return val.replace(EMAIL_REGEX, MASKED_EMAIL);
            }
          }
          return val;
        },
        set: function (newVal) {
          if (this.name === "value" && this.ownerElement && isEmailField(this.ownerElement)) {
            return attrNodeValDesc.set ? attrNodeValDesc.set.call(this, MASKED_EMAIL) : MASKED_EMAIL;
          }
          return attrNodeValDesc.set ? attrNodeValDesc.set.call(this, newVal) : newVal;
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {}

  // 4. Prototype Guard on HTMLInputElement.prototype.value and defaultValue
  try {
    const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    if (valueDescriptor && valueDescriptor.get) {
      const origValueGet = valueDescriptor.get;
      const origValueSet = valueDescriptor.set;

      Object.defineProperty(HTMLInputElement.prototype, "value", {
        get: function () {
          if (isEmailField(this)) {
            return MASKED_EMAIL;
          }
          const val = origValueGet.apply(this);
          if (typeof val === "string" && EMAIL_REGEX.test(val)) {
            return val.replace(EMAIL_REGEX, MASKED_EMAIL);
          }
          return val;
        },
        set: function (newVal) {
          if (isEmailField(this)) {
            return origValueSet ? origValueSet.call(this, MASKED_EMAIL) : MASKED_EMAIL;
          }
          return origValueSet ? origValueSet.call(this, newVal) : newVal;
        },
        configurable: true,
        enumerable: true,
      });
    }

    const defaultDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "defaultValue");
    if (defaultDescriptor && defaultDescriptor.get) {
      Object.defineProperty(HTMLInputElement.prototype, "defaultValue", {
        get: function () {
          if (isEmailField(this)) {
            return MASKED_EMAIL;
          }
          return MASKED_EMAIL;
        },
        set: function () {
          return MASKED_EMAIL;
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {}

  // 5. Prototype Guard on Element.prototype.outerHTML and innerHTML
  try {
    const outerHtmlDesc = Object.getOwnPropertyDescriptor(Element.prototype, "outerHTML");
    if (outerHtmlDesc && outerHtmlDesc.get) {
      const origOuterGet = outerHtmlDesc.get;
      Object.defineProperty(Element.prototype, "outerHTML", {
        get: function () {
          const html = origOuterGet.apply(this);
          if (typeof html === "string" && EMAIL_REGEX.test(html)) {
            return html.replace(EMAIL_REGEX, MASKED_EMAIL);
          }
          return html;
        },
        configurable: true,
        enumerable: true,
      });
    }

    const innerHtmlDesc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    if (innerHtmlDesc && innerHtmlDesc.get) {
      const origInnerGet = innerHtmlDesc.get;
      Object.defineProperty(Element.prototype, "innerHTML", {
        get: function () {
          const html = origInnerGet.apply(this);
          if (typeof html === "string" && EMAIL_REGEX.test(html)) {
            return html.replace(EMAIL_REGEX, MASKED_EMAIL);
          }
          return html;
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {}

  // 6. Console fetch() Interceptor: Blocks REST API leakage and sanitizes responses
  if (typeof window !== "undefined" && window.fetch) {
    try {
      const origFetch = window.fetch;
      window.fetch = async function (...args) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        const lowerUrl = url.toLowerCase();

        const isUsersMe =
          lowerUrl.includes("/wp-json/wp/v2/users/me") ||
          lowerUrl.includes("rest_route=/wp/v2/users/me") ||
          lowerUrl.includes("rest_route=%2fwp%2fv2%2fusers%2fme");
        const isUsersRestricted =
          (lowerUrl.includes("/wp-json/wp/v2/users") ||
            lowerUrl.includes("rest_route=/wp/v2/users") ||
            lowerUrl.includes("rest_route=%2fwp%2fv2%2fusers")) &&
          !isUsersMe;
        const isSettingsRestricted =
          lowerUrl.includes("/wp-json/wp/v2/settings") ||
          lowerUrl.includes("rest_route=/wp/v2/settings") ||
          lowerUrl.includes("rest_route=%2fwp%2fv2%2fsettings");

        // Strict Block for REST API settings and other users leakage
        if (isSettingsRestricted || isUsersRestricted) {
          console.warn("[Reno Access Sentinel] Blocked REST API query to administrative endpoint:", url);
          return new Response(
            JSON.stringify({ error: "Access to administrative data is restricted by Reno Hub." }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const response = await origFetch.apply(this, args);

        // Sanitize /wp-json/wp/v2/users/me response (allow WP preferences, mask email)
        if (isUsersMe) {
          try {
            if (response.status === 204 || response.status === 304) {
              return response;
            }
            const cloned = response.clone();
            const text = await cloned.text();
            if (!text) return response;
            const sanitized = text.replace(EMAIL_REGEX, MASKED_EMAIL);
            return new Response(sanitized, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          } catch (e) {
            return response;
          }
        }

        // Sanitize response HTML if fetching settings pages via console
        if (
          lowerUrl.includes("options-general.php") ||
          lowerUrl.includes("options.php")
        ) {
          try {
            const cloned = response.clone();
            const text = await cloned.text();
            const sanitized = text.replace(EMAIL_REGEX, MASKED_EMAIL);
            return new Response(sanitized, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          } catch (e) {
            return response;
          }
        }

        return response;
      };
    } catch (e) {}
  }

  // 7. Console XMLHttpRequest Interceptor
  if (typeof window !== "undefined" && window.XMLHttpRequest) {
    try {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._renoSentinelUrl = typeof url === "string" ? url : "";
        return origOpen.call(this, method, url, ...rest);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        const lowerUrl = (this._renoSentinelUrl || "").toLowerCase();
        const isUsersMe =
          lowerUrl.includes("/wp-json/wp/v2/users/me") ||
          lowerUrl.includes("rest_route=/wp/v2/users/me") ||
          lowerUrl.includes("rest_route=%2fwp%2fv2%2fusers%2fme");
        const isUsersRestricted =
          (lowerUrl.includes("/wp-json/wp/v2/users") ||
            lowerUrl.includes("rest_route=/wp/v2/users") ||
            lowerUrl.includes("rest_route=%2fwp%2fv2%2fusers")) &&
          !isUsersMe;
        const isSettingsRestricted =
          lowerUrl.includes("/wp-json/wp/v2/settings") ||
          lowerUrl.includes("rest_route=/wp/v2/settings") ||
          lowerUrl.includes("rest_route=%2fwp%2fv2%2fsettings");

        if (isSettingsRestricted || isUsersRestricted) {
          console.warn("[Reno Access Sentinel] Blocked XHR query to administrative endpoint:", lowerUrl);
          Object.defineProperty(this, "status", { value: 403, writable: false });
          Object.defineProperty(this, "responseText", {
            value: JSON.stringify({ error: "Access restricted by Reno Hub." }),
            writable: false,
          });
          if (typeof this.onreadystatechange === "function") {
            this.onreadystatechange();
          }
          return;
        }
        return origSend.apply(this, args);
      };
    } catch (e) {}
  }

  // 8. Main-world immediate attribute scrubber for existing and newly parsed inputs
  function scrubMainWorldInputs() {
    const inputs = document.querySelectorAll(
      'input#admin_email, input#new_admin_email, input[name="admin_email"], input[name="new_admin_email"], input[type="email"], input[id*="email" i], input[name*="email" i]'
    );
    inputs.forEach((input) => {
      try {
        input.setAttribute("value", MASKED_EMAIL);
        input.value = MASKED_EMAIL;
        input.defaultValue = MASKED_EMAIL;
      } catch (e) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scrubMainWorldInputs);
  } else {
    scrubMainWorldInputs();
  }
})();
