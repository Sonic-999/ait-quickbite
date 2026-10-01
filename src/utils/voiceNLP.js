/**
 * Voice-to-Cart NLP (Natural Language Processing) Utility
 * 
 * Parses spoken speech transcripts (e.g., "Get me two samosas and a cold coffee"),
 * matches keywords and aliases against campus MenuItems, extracts exact quantities,
 * and formats the success toast notification.
 */

// Number word dictionary
const NUMBER_WORDS = {
  'a': 1,
  'an': 1,
  'one': 1,
  'single': 1,
  'two': 2,
  'pair': 2,
  'couple': 2,
  'double': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'half dozen': 6,
  'dozen': 12,
};

// Canonical Campus Menu Knowledge Base with comprehensive aliases and colloquialisms
export const CAMPUS_MENU_CATALOG = [
  {
    id: 'jc-bs-samosa',
    name: 'Crispy Punjabi Samosa (2 pcs)',
    shortName: 'Samosa',
    price: 30,
    shopName: 'Juice Center',
    category: 'Bestsellers',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 5,
    inStockQuantity: 15,
    aliases: [
      'samosa',
      'samosas',
      'punjabi samosa',
      'punjabi samosas',
      'crispy samosa',
      'crispy punjabi samosa',
      'samosa pav',
      'samosay',
      'somosa',
      'samose',
    ],
  },
  {
    id: 'jc-bev-coldcoffee',
    name: 'Signature Chilled Cold Coffee',
    shortName: 'Cold Coffee',
    price: 40,
    shopName: 'Juice Center',
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop',
    prepTimeMinutes: 3,
    inStockQuantity: 40,
    aliases: [
      'cold coffee',
      'cold coffees',
      'chilled coffee',
      'iced coffee',
      'iced cold coffee',
      'frappe',
      'cold cafe',
      'coffee cold',
      'signature iced cold coffee',
    ],
  },
  {
    id: 'jc-bs-orange',
    name: 'Fresh Orange Juice',
    shortName: 'Orange Juice',
    price: 40,
    shopName: 'Juice Center',
    category: 'Bestsellers',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 2,
    inStockQuantity: 20,
    aliases: [
      'orange juice',
      'orange juices',
      'orange',
      'fresh orange juice',
      'oranges',
      'santre juice',
      'santre ka juice',
    ],
  },
  {
    id: 'jc-tea-special',
    name: 'AIT Special Cutting Chai',
    shortName: 'Cutting Chai',
    price: 15,
    shopName: 'Juice Center',
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop',
    prepTimeMinutes: 2,
    inStockQuantity: 50,
    aliases: [
      'cutting chai',
      'cutting chais',
      'chai',
      'chais',
      'masala chai',
      'tea',
      'hot tea',
      'ait special cutting chai',
      'cutting tea',
      'special chai',
    ],
  },
  {
    id: 'jc-sn-patty',
    name: 'Crispy Golden Veg Patty',
    shortName: 'Veg Patty',
    price: 20,
    shopName: 'Juice Center',
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
    prepTimeMinutes: 2,
    inStockQuantity: 50,
    aliases: [
      'patty',
      'patties',
      'veg patty',
      'veg patties',
      'puff',
      'veg puff',
      'golden patty',
      'aloom patty',
    ],
  },
  {
    id: 'jc-bs-sandwich',
    name: 'Grilled Paneer Brown Sandwich',
    shortName: 'Paneer Sandwich',
    price: 55,
    shopName: 'Juice Center',
    category: 'Bestsellers',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 6,
    inStockQuantity: 15,
    aliases: [
      'paneer sandwich',
      'grilled paneer sandwich',
      'brown sandwich',
      'sandwich',
      'sandwiches',
      'grilled sandwich',
      'cheese sandwich',
    ],
  },
  {
    id: 'jc-j-mosambi',
    name: 'Sweet Lime (Mosambi) Juice',
    shortName: 'Mosambi Juice',
    price: 40,
    shopName: 'Juice Center',
    category: 'Juices',
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 3,
    inStockQuantity: 20,
    aliases: [
      'mosambi juice',
      'mosambi',
      'sweet lime',
      'sweet lime juice',
      'lime juice',
    ],
  },
  {
    id: 'jc-j-watermelon',
    name: 'Fresh Watermelon Cooler',
    shortName: 'Watermelon Juice',
    price: 35,
    shopName: 'Juice Center',
    category: 'Juices',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 3,
    inStockQuantity: 25,
    aliases: [
      'watermelon',
      'watermelon juice',
      'watermelon cooler',
      'fresh watermelon',
      'tarbooj juice',
    ],
  },
  {
    id: 'jc-bs-mango',
    name: 'Alphonso Mango Thick Shake',
    shortName: 'Mango Shake',
    price: 55,
    shopName: 'Juice Center',
    category: 'Shakes',
    image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 4,
    inStockQuantity: 15,
    aliases: [
      'mango shake',
      'mango thick shake',
      'alphonso mango shake',
      'mango smoothie',
      'mango',
    ],
  },
  {
    id: 'nb-3',
    name: 'Butter Masala Maggi',
    shortName: 'Masala Maggi',
    price: 40,
    shopName: 'Nescafe Booth',
    category: 'Hot Food',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 5,
    inStockQuantity: 30,
    aliases: [
      'maggi',
      'masala maggi',
      'butter maggi',
      'noodles',
    ],
  },
  {
    id: 'mc-2',
    name: 'Crispy Masala Dosa',
    shortName: 'Masala Dosa',
    price: 55,
    shopName: 'Main Canteen',
    category: 'South Indian',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 7,
    inStockQuantity: 25,
    aliases: [
      'dosa',
      'masala dosa',
      'crispy dosa',
    ],
  },
  {
    id: 'mc-3',
    name: 'Chole Bhature (2 pcs)',
    shortName: 'Chole Bhature',
    price: 70,
    shopName: 'Main Canteen',
    category: 'North Indian',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80',
    prepTimeMinutes: 8,
    inStockQuantity: 20,
    aliases: [
      'chole bhature',
      'bhature',
      'chola bhatura',
      'chhole bhature',
    ],
  },
];

/**
 * Normalizes speech text and converts verbal number words to digits.
 */
function normalizeSpeechText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lightweight NLP Parser:
 * Analyzes natural language transcribed voice commands (e.g., "Get me two samosas and a cold coffee").
 * Matches items against MenuItems, extracts quantities, and generates toast notifications.
 * 
 * @param {string} rawTranscript - Spoken sentence from Web Speech API
 * @param {Array} dynamicMenuItems - Optional active menu items from server/DB
 * @returns {Object} { success, matchedItems, toastMessage, rawTranscript }
 */
export function parseVoiceOrder(rawTranscript, dynamicMenuItems = null) {
  const normalized = normalizeSpeechText(rawTranscript);
  if (!normalized) {
    return {
      success: false,
      matchedItems: [],
      toastMessage: 'No speech detected. Please hold and try again!',
      rawTranscript: '',
    };
  }

  // Combine static catalog with any dynamically provided items from the DB
  const catalog = [...CAMPUS_MENU_CATALOG];
  if (Array.isArray(dynamicMenuItems) && dynamicMenuItems.length > 0) {
    dynamicMenuItems.forEach((dItem) => {
      if (!catalog.some((c) => c.id === dItem.id)) {
        const baseName = (dItem.name || '').toLowerCase();
        catalog.push({
          id: dItem.id,
          name: dItem.name,
          shortName: dItem.name.split('(')[0].trim(),
          price: dItem.price || 40,
          shopName: dItem.shop_name || dItem.shopName || 'Juice Center',
          category: dItem.category || 'General',
          image: dItem.fallback_image || dItem.image,
          prepTimeMinutes: dItem.prep_time_minutes || 4,
          inStockQuantity: dItem.in_stock_quantity || 20,
          aliases: [baseName, baseName.replace(/[^a-z0-9 ]/g, '')],
        });
      }
    });
  }

  // Split transcript into potential sub-clauses using conjunctions
  // e.g. "Get me two samosas and a cold coffee" -> ["Get me two samosas", "a cold coffee"]
  const clauseDelimiters = /\b(?:and\s+also|and\s+then|and|plus|with|also|then|,)\b/gi;
  const rawClauses = normalized.split(clauseDelimiters).map((s) => s.trim()).filter(Boolean);

  const matchedItemsMap = new Map();

  // Helper to extract numeric quantity from a clause or words preceding an alias
  const extractQuantity = (clauseStr, aliasStr) => {
    // If quantity is written like "2x" or "3 x"
    const xMatch = clauseStr.match(/(\d+)\s*x\b/i);
    if (xMatch) return parseInt(xMatch[1], 10);

    // Look for numbers or number words appearing before the alias
    const aliasIndex = clauseStr.indexOf(aliasStr);
    const textBeforeAlias = aliasIndex >= 0 ? clauseStr.substring(0, aliasIndex).trim() : clauseStr;
    const tokens = textBeforeAlias.split(/\s+/).filter(Boolean);

    // Check last 2 tokens before alias
    for (let i = tokens.length - 1; i >= Math.max(0, tokens.length - 3); i--) {
      const tok = tokens[i].toLowerCase();
      if (!isNaN(tok) && parseInt(tok, 10) > 0) {
        return parseInt(tok, 10);
      }
      if (NUMBER_WORDS[tok]) {
        return NUMBER_WORDS[tok];
      }
    }

    // Check if whole clause has an explicit number
    const words = clauseStr.split(/\s+/);
    for (const w of words) {
      if (!isNaN(w) && parseInt(w, 10) > 0) {
        return parseInt(w, 10);
      }
      if (NUMBER_WORDS[w] && NUMBER_WORDS[w] > 1) {
        return NUMBER_WORDS[w];
      }
    }

    // Default to 1 (e.g. "a cold coffee", "samosa", "one samosa")
    return 1;
  };

  // Sort aliases by length descending so longer phrases match first ("cold coffee" before "coffee")
  const allAliases = [];
  catalog.forEach((item) => {
    const itemAliases = item.aliases || [item.name.toLowerCase()];
    itemAliases.forEach((alias) => {
      allAliases.push({
        alias: alias.toLowerCase().trim(),
        item,
      });
    });
  });
  allAliases.sort((a, b) => b.alias.length - a.alias.length);

  // Strategy A: Evaluate clause by clause
  rawClauses.forEach((clause) => {
    let clauseMatched = false;
    for (const entry of allAliases) {
      // Regex boundary match for alias in clause
      const escapedAlias = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, 'i');

      if (aliasRegex.test(clause)) {
        const qty = extractQuantity(clause, entry.alias);
        const existing = matchedItemsMap.get(entry.item.id);
        if (existing) {
          existing.quantity += qty;
        } else {
          matchedItemsMap.set(entry.item.id, {
            item: entry.item,
            quantity: qty,
            matchedAlias: entry.alias,
          });
        }
        clauseMatched = true;
        break; // matched the best alias in this clause
      }
    }

    // Strategy B: If no exact boundary, check substring in clause
    if (!clauseMatched) {
      for (const entry of allAliases) {
        if (clause.includes(entry.alias)) {
          const qty = extractQuantity(clause, entry.alias);
          const existing = matchedItemsMap.get(entry.item.id);
          if (existing) {
            existing.quantity += qty;
          } else {
            matchedItemsMap.set(entry.item.id, {
              item: entry.item,
              quantity: qty,
              matchedAlias: entry.alias,
            });
          }
          break;
        }
      }
    }
  });

  // Fallback: If no clauses matched, scan entire normalized sentence for aliases
  if (matchedItemsMap.size === 0) {
    allAliases.forEach((entry) => {
      const escapedAlias = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, 'i');
      if (aliasRegex.test(normalized) && !matchedItemsMap.has(entry.item.id)) {
        const qty = extractQuantity(normalized, entry.alias);
        matchedItemsMap.set(entry.item.id, {
          item: entry.item,
          quantity: qty,
          matchedAlias: entry.alias,
        });
      }
    });
  }

  const matchedList = Array.from(matchedItemsMap.values());

  if (matchedList.length === 0) {
    return {
      success: false,
      matchedItems: [],
      toastMessage: `Could not find matching menu items for: "${rawTranscript}"`,
      rawTranscript,
    };
  }

  // Format success toast notification:
  // e.g. "Added 2x Samosa, 1x Cold Coffee to cart"
  const itemStrings = matchedList.map(
    (m) => `${m.quantity}x ${m.item.shortName || m.item.name}`
  );
  const toastMessage = `Added ${itemStrings.join(', ')} to cart`;

  return {
    success: true,
    matchedItems: matchedList,
    toastMessage,
    rawTranscript,
    totalCount: matchedList.reduce((sum, it) => sum + it.quantity, 0),
  };
}
