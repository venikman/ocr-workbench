// Same-origin paths keep the component on the host application's API boundary.
export function componentOptions({
  storageKey = null,
  ocrBaseUrl = null,
} = {}) {
  if (
    storageKey !== null &&
    (typeof storageKey !== "string" ||
      !storageKey.trim() ||
      storageKey.length > 200)
  )
    throw new Error(
      "storageKey must be null or a nonempty browser database name of at most 200 characters.",
    );
  if (ocrBaseUrl !== null) {
    if (
      typeof ocrBaseUrl !== "string" ||
      !/^\/(?:[A-Za-z0-9_-]+\/?)+$/.test(ocrBaseUrl)
    )
      throw new Error(
        "ocrBaseUrl must be null or a same-origin path such as /api/ocr-workbench.",
      );
    ocrBaseUrl = ocrBaseUrl.replace(/\/$/, "");
  }
  return { storageKey, ocrBaseUrl };
}
