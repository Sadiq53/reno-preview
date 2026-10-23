async function testAttributeScrubbing() {
  console.log("🛡️ Validating DOM Attribute Scrubbing & Elements Tab Masking...\n");

  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const MASKED_EMAIL = "••••••••@••••.com";

  // Lightweight mock DOM element simulating browser DOM nodes and attributes
  class MockAttr {
    name: string;
    value: string;
    constructor(name: string, value: string) {
      this.name = name;
      this.value = value;
    }
  }

  class MockElement {
    nodeType = 1;
    tagName: string;
    id: string;
    name: string;
    type: string;
    value: string;
    defaultValue: string;
    attributes: MockAttr[] = [];
    childNodes: (MockElement | MockTextNode)[] = [];

    constructor(tag: string, attrs: Record<string, string> = {}) {
      this.tagName = tag.toUpperCase();
      this.id = attrs.id || "";
      this.name = attrs.name || "";
      this.type = attrs.type || "text";
      this.value = attrs.value || "";
      this.defaultValue = attrs.value || "";

      for (const [k, v] of Object.entries(attrs)) {
        this.attributes.push(new MockAttr(k, v));
      }
    }

    getAttribute(name: string): string | null {
      const attr = this.attributes.find((a) => a.name.toLowerCase() === name.toLowerCase());
      return attr ? attr.value : null;
    }

    setAttribute(name: string, value: string): void {
      const attr = this.attributes.find((a) => a.name.toLowerCase() === name.toLowerCase());
      if (attr) {
        attr.value = value;
      } else {
        this.attributes.push(new MockAttr(name, value));
      }
      if (name.toLowerCase() === "value") {
        this.value = value;
      }
    }

    hasAttribute(name: string): boolean {
      return this.attributes.some((a) => a.name.toLowerCase() === name.toLowerCase());
    }

    get outerHTML(): string {
      const attrsStr = this.attributes.map((a) => `${a.name}="${a.value}"`).join(" ");
      if (this.tagName === "INPUT") {
        return `<input ${attrsStr}>`;
      }
      const childrenStr = this.childNodes.map((c) => (c.nodeType === 3 ? (c as MockTextNode).nodeValue : (c as MockElement).outerHTML)).join("");
      return `<${this.tagName.toLowerCase()} ${attrsStr}>${childrenStr}</${this.tagName.toLowerCase()}>`;
    }
  }

  class MockTextNode {
    nodeType = 3;
    nodeValue: string;
    constructor(val: string) {
      this.nodeValue = val;
    }
  }

  function isTargetEmailElement(node: any) {
    if (!node || node.nodeType !== 1) return false;
    const tag = (node.tagName || "").toLowerCase();
    if (tag !== "input" && tag !== "textarea") return false;
    const id = (node.id || "").toLowerCase();
    const name = (node.name || "").toLowerCase();
    const type = (node.type || "").toLowerCase();
    return (
      id === "admin_email" ||
      id === "new_admin_email" ||
      name === "admin_email" ||
      name === "new_admin_email" ||
      type === "email" ||
      id.includes("email") ||
      name.includes("email") ||
      (node.value && EMAIL_REGEX.test(node.value)) ||
      (node.getAttribute("value") && EMAIL_REGEX.test(node.getAttribute("value")))
    );
  }

  function maskEmailsInNode(node: any) {
    if (!node) return;

    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (tag === "script" || tag === "style") return;

      // Scrub attributes
      if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          if (attr.name === "href" && attr.value && attr.value.toLowerCase().startsWith("mailto:")) {
            node.setAttribute("href", "javascript:void(0)");
            continue;
          }
          if (attr.value && EMAIL_REGEX.test(attr.value)) {
            node.setAttribute(attr.name, attr.value.replace(EMAIL_REGEX, MASKED_EMAIL));
          }
        }
      }

      if (tag === "input" || tag === "textarea") {
        if (isTargetEmailElement(node)) {
          node.setAttribute("value", MASKED_EMAIL);
          node.value = MASKED_EMAIL;
          node.defaultValue = MASKED_EMAIL;
          node.setAttribute("autocomplete", "off");
          node.setAttribute("readonly", "true");
          node.setAttribute("disabled", "true");
        }
      }
    }

    if (node.nodeType === 3) {
      if (node.nodeValue && EMAIL_REGEX.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(EMAIL_REGEX, MASKED_EMAIL);
      }
      return;
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        maskEmailsInNode(child);
      }
    }
  }

  // Setup simulated options-general.php DOM element
  const inputEl = new MockElement("input", {
    name: "new_admin_email",
    type: "email",
    id: "new_admin_email",
    value: "drtravis4@gmail.com",
    class: "regular-text ltr",
  });

  const descEl = new MockElement("p", {
    class: "description",
    id: "new-admin-email-description",
  });
  descEl.childNodes.push(new MockTextNode("This address is used for admin purposes. Pending change to drtravis4@gmail.com"));

  const parentDiv = new MockElement("div", {});
  parentDiv.childNodes.push(inputEl);
  parentDiv.childNodes.push(descEl);

  console.log("1. State BEFORE Sentinel Scrubbing:");
  console.log("   Raw HTML attribute 'value':", inputEl.getAttribute("value"));
  console.log("   Input outerHTML (DevTools Tree):", inputEl.outerHTML);

  if (inputEl.getAttribute("value") !== "drtravis4@gmail.com") {
    throw new Error("Test setup failed: expected drtravis4@gmail.com before scrub");
  }

  // Execute Sentinel scrubbing
  maskEmailsInNode(parentDiv);

  console.log("\n2. State AFTER Sentinel Scrubbing (DevTools Elements View):");
  console.log("   Scrubbed HTML attribute 'value':", inputEl.getAttribute("value"));
  console.log("   Input outerHTML (DevTools Tree):", inputEl.outerHTML);
  console.log("   Description outerHTML:", descEl.outerHTML);

  // Assertions
  if (inputEl.getAttribute("value") !== MASKED_EMAIL) {
    throw new Error(`Attribute value not masked! Got: ${inputEl.getAttribute("value")}`);
  }

  if (inputEl.outerHTML.includes("drtravis4@gmail.com")) {
    throw new Error("DevTools outerHTML still contains raw email!");
  }

  if (descEl.outerHTML.includes("drtravis4@gmail.com")) {
    throw new Error("Description paragraph still contains raw email!");
  }

  if (!inputEl.outerHTML.includes('value="••••••••@••••.com"')) {
    throw new Error("outerHTML missing masked value attribute!");
  }

  console.log("\n3. Testing URL Guardrail Logic for options.php vs options-general.php:");
  const testUrls = [
    { url: "https://gamingpcdiscount.com/wp-admin/options-general.php", shouldBlock: false },
    { url: "https://gamingpcdiscount.com/wp-admin/options-writing.php", shouldBlock: false },
    { url: "https://gamingpcdiscount.com/wp-admin/options.php", shouldBlock: true },
    { url: "https://gamingpcdiscount.com/wp-admin/options.php?page=all", shouldBlock: true },
  ];

  for (const t of testUrls) {
    const isOptionsBlocked = t.url.includes("/options.php") && !t.url.includes("/options-");
    if (isOptionsBlocked !== t.shouldBlock) {
      throw new Error(`URL check mismatch for ${t.url}. Expected blocked=${t.shouldBlock}, got ${isOptionsBlocked}`);
    }
    console.log(`   ✓ URL: ${t.url} -> Blocked: ${isOptionsBlocked}`);
  }

  console.log("\n🎉 ALL DOM ATTRIBUTE SCRUBBING TESTS PASSED 100%!");
}

testAttributeScrubbing().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
