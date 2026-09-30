(function () {
  "use strict";

  const dictionaries = new Map();
  const builtInPlaceholders = new Set([
    "name", "comment", "amount", "currency", "giftLabel", "giftCount"
  ]);
  const appearanceKeys = new Set([
    "fontFamily", "fontSizePx", "cardMaxWidthPx", "cardBackground", "textColor",
    "accentColor", "border", "boxShadow", "borderRadiusPx", "popDurationMs"
  ]);

  function validate(dictionary) {
    if (!dictionary || typeof dictionary !== "object") return "dictionary must be an object";
    if (!String(dictionary.id || "").trim()) return "id is required";
    if (!Array.isArray(dictionary.templates) || !dictionary.templates.length) return "templates is required";
    if (!dictionary.words || typeof dictionary.words !== "object") return "words is required";
    if (dictionary.appearance !== undefined) {
      if (!dictionary.appearance || typeof dictionary.appearance !== "object" || Array.isArray(dictionary.appearance)) {
        return "appearance must be an object";
      }
      if (dictionary.appearance.preset !== undefined && !String(dictionary.appearance.preset).trim()) {
        return "appearance.preset cannot be empty";
      }
      if (dictionary.appearance.overrides !== undefined) {
        const overrides = dictionary.appearance.overrides;
        if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
          return "appearance.overrides must be an object";
        }
        const unknownKey = Object.keys(overrides).find(key => !appearanceKeys.has(key));
        if (unknownKey) return `unknown appearance override: ${unknownKey}`;
      }
    }

    const wordKeys = new Set(Object.keys(dictionary.words));
    for (const [key, values] of Object.entries(dictionary.words)) {
      if (!Array.isArray(values) || !values.some(value => String(value || "").trim())) {
        return `words.${key} must contain at least one value`;
      }
    }

    for (const template of dictionary.templates) {
      if (!String(template || "").trim()) return "templates cannot contain empty values";
      for (const match of String(template).matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)) {
        if (!builtInPlaceholders.has(match[1]) && !wordKeys.has(match[1])) {
          return `unknown placeholder: ${match[1]}`;
        }
      }
    }
    return "";
  }

  window.CNE_registerEventDictionary = function (dictionary) {
    const error = validate(dictionary);
    const id = String(dictionary?.id || "").trim();
    if (error) {
      console.warn(`[CNE] Dictionary rejected (${id || "unknown"}): ${error}`);
      return false;
    }
    if (dictionaries.has(id)) {
      console.warn(`[CNE] Duplicate dictionary id ignored: ${id}`);
      return false;
    }
    dictionaries.set(id, Object.freeze({ ...dictionary, id }));
    return true;
  };

  window.CNE_EVENT_DICTIONARIES = dictionaries;
})();
