const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export function previewDocument(raw) {
  const allowed = new Set([
    "TABLE",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TD",
    "TH",
    "P",
    "BR",
    "DIV",
    "SPAN",
    "H1",
    "H2",
    "H3",
    "H4",
    "UL",
    "OL",
    "LI",
    "STRONG",
    "EM",
    "B",
    "I",
    "PRE",
    "CODE",
    "SUB",
    "SUP",
    "HR",
  ]);
  let html;
  if (/<(?:table|div|p|h[1-4]|br)\b/i.test(raw)) {
    // Template contents belong to an inert document: parsing never fetches the
    // untrusted image/frame URLs that DOMParser may load before sanitization.
    const template = document.createElement("template");
    template.innerHTML = raw;
    const clean = (node, depth = 0) => {
      if (depth > 64) return escape(node.textContent || "");
      if (node.nodeType === 3) return escape(node.textContent);
      if (
        node.nodeType !== 1 ||
        [
          "SCRIPT",
          "STYLE",
          "IFRAME",
          "OBJECT",
          "EMBED",
          "SVG",
          "MATH",
          "FORM",
          "INPUT",
          "BUTTON",
          "LINK",
          "META",
          "IMG",
        ].includes(node.tagName)
      )
        return "";
      const content = [...node.childNodes]
        .map((child) => clean(child, depth + 1))
        .join("");
      if (!allowed.has(node.tagName)) return content;
      const tag = node.tagName.toLowerCase(),
        spans = ["colspan", "rowspan"]
          .map((key) =>
            /^(?:[1-9]|[1-9][0-9])$/.test(node.getAttribute(key) || "")
              ? ` ${key}="${node.getAttribute(key)}"`
              : "",
          )
          .join("");
      return `<${tag}${spans}>${content}</${tag}>`;
    };
    html = [...template.content.childNodes].map((node) => clean(node)).join("");
  } else
    html = raw
      .split("\n")
      .map((line) => {
        const h = line.match(/^(#{1,4}) (.*)$/);
        return h
          ? `<h${h[1].length}>${escape(h[2])}</h${h[1].length}>`
          : `<div class="line">${escape(line) || "&nbsp;"}</div>`;
      })
      .join("");
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:24px;color:#302d27;font:14px/1.6 Georgia,serif;overflow-wrap:anywhere}.line{white-space:pre-wrap;min-height:1.6em}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #bbb;padding:5px;text-align:left}pre,code{white-space:pre-wrap}h1{font-size:22px}h2{font-size:19px}</style></head><body>${html}</body></html>`;
}
