/**
 * VCT SDK 2.0 v2.0.3-dev
 * OneSDKコメントを単一APIで正規化する。
 */
(function (global) {
    'use strict';

    const VERSION = '2.0.3-dev';
    const DEFAULT_COLOR = Object.freeze({ r: 255, g: 255, b: 255 });

    function stringValue(value) {
        return value == null ? '' : String(value);
    }

    function payloadOf(raw) {
        return raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw || {};
    }

    function firstNonEmpty(values) {
        const found = values.find((value) => stringValue(value).trim());
        return found == null ? '' : stringValue(found);
    }

    function parseHtml(html) {
        const source = stringValue(html);
        if (!source) return { text: '', parts: [], imageUrls: [] };

        const doc = new DOMParser().parseFromString(source, 'text/html');
        const parts = [];
        const imageUrls = [];

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent) parts.push({ type: 'text', content: node.textContent });
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.tagName === 'IMG') {
                const url = node.dataset.src || node.getAttribute('src') || '';
                parts.push({
                    type: 'emoji',
                    url,
                    alt: node.getAttribute('alt') || '',
                    isSticker: node.classList.contains('gift-sticker') || node.classList.contains('gift-image')
                });
                if (url) imageUrls.push(url);
                return;
            }
            if (node.tagName === 'BR') {
                parts.push({ type: 'text', content: '\n' });
                return;
            }
            node.childNodes.forEach(walk);
        }

        doc.body.childNodes.forEach(walk);
        return {
            text: parts.filter((part) => part.type === 'text').map((part) => part.content).join('').trim(),
            parts,
            imageUrls
        };
    }

    function parseCommand(text) {
        const source = stringValue(text).trim();
        const match = source.match(/^!([^\s!]+)(?:\s+([\s\S]*))?$/u);
        return match
            ? { exists: true, name: match[1], body: (match[2] || '').trim(), fullText: source }
            : { exists: false, name: '', body: '', fullText: source };
    }

    function numberValue(value) {
        if (value == null) return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'object') {
            return numberValue(value.amount ?? value.value ?? value.price ?? value.count ?? value.text);
        }
        const match = stringValue(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : 0;
    }

    function parseColor(value) {
        if (!value) return null;
        if (typeof value === 'object' && value.r != null && value.g != null && value.b != null) {
            return { r: Number(value.r), g: Number(value.g), b: Number(value.b) };
        }
        if (typeof value !== 'string') return null;
        const rgb = value.match(/rgba?\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)/i);
        if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
        const hex = value.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        return hex ? { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) } : null;
    }

    function usableColor(color) {
        return color && !(color.r === 0 && color.g === 0 && color.b === 0);
    }

    function jewelLabel(text) {
        const source = stringValue(text).trim();
        const legacyMatch = source.match(/^ジュエル\s*[\d,]+\s*個\s*を使って\s*(.+?)\s*を送りました$/u);
        if (legacyMatch) return legacyMatch[1].trim();

        const currentMatch = source.match(/^(.+?)\s*を(?:送信|送り)しました$/u);
        if (!currentMatch) return '';

        const label = currentMatch[1].trim();
        return label === 'ジュエル' ? '' : label;
    }

    function jewelCount(data, messageText) {
        const candidates = [data?.jewels, data?.jewelCount, data?.price, data?.paidAmount, data?.amount, data?.paidText];
        for (const candidate of candidates) {
            const count = numberValue(candidate);
            if (count > 0) return count;
        }
        const match = stringValue(messageText).match(/ジュエル\s*([\d,]+)\s*個/u);
        return match ? numberValue(match[1]) : 0;
    }

    function membershipGiftCount(data, messageText) {
        const giftType = stringValue(data?.giftType).toLowerCase();
        if (giftType !== 'sponsorgift' && !data?.isSponsorshipGiftSender) return 0;
        const direct = numberValue(data?.giftCount ?? data?.price);
        if (direct > 0) return direct;
        const match = stringValue(messageText).match(/(\d+)\s*個/u);
        return match ? Number(match[1]) : 0;
    }

    function moneyInfo(raw, data, excluded) {
        const candidates = [
            data?.price, data?.paidAmount, data?.amount, data?.money,
            raw?.price, raw?.payload?.price, raw?.payload?.data?.price, raw?.payload?.data?.money
        ];
        let amount = 0;
        for (const candidate of candidates) {
            amount = numberValue(candidate);
            if (amount > 0) break;
        }
        const displayText = stringValue(data?.paidText || raw?.payload?.data?.paidText).trim();
        if (amount <= 0) amount = numberValue(displayText);
        const currency = stringValue(data?.currency || data?.money?.currency || raw?.currency).trim();
        const available = !excluded && amount > 0 && !!(currency || displayText);
        return { available, amount: available ? amount : 0, currency: available ? currency : '', displayText: available ? displayText : '' };
    }

    function eventInfo(context) {
        const { giftType, messageText, membership, monetization } = context;
        const base = {
            kind: 'normal', category: 'comment', isSupport: false, isMembership: false,
            displayLabel: '', announcementText: '', shouldShowMessage: true
        };
        const moneyLabel = monetization.money.displayText || (
            monetization.money.available
                ? `${monetization.money.currency ? `${monetization.money.currency} ` : ''}${monetization.money.amount.toLocaleString()}`
                : ''
        );
        if (giftType === 'superchat') return { ...base, kind: 'superchat', category: 'support', isSupport: true, displayLabel: moneyLabel || 'スパチャ' };
        if (giftType === 'supersticker') return { ...base, kind: 'supersticker', category: 'support', isSupport: true, displayLabel: moneyLabel || 'ステッカー' };
        if (giftType === 'jewel') return { ...base, kind: 'jewel', category: 'support', isSupport: true, displayLabel: monetization.gift.label || 'ジュエル' };
        if (membership.isGiftSender) {
            return {
                ...base, kind: 'membership_gift', category: 'membership', isSupport: true, isMembership: true,
                displayLabel: membership.giftCount > 0 ? `メンバーシップギフト ${membership.giftCount}件` : 'メンバーシップギフト'
            };
        }
        if (membership.isGiftReceiver) {
            return { ...base, kind: 'membership_gift_received', category: 'membership', isMembership: true, displayLabel: 'メンバーシップギフト受取', shouldShowMessage: false };
        }
        if (giftType === 'subscribe') {
            return {
                ...base, kind: 'member_join', category: 'membership', isMembership: true,
                displayLabel: '新規メンバー', announcementText: membership.sub || membership.primary, shouldShowMessage: !!messageText
            };
        }
        if (giftType === 'milestonechat' && membership.primary && messageText) {
            return { ...base, kind: 'member_milestone', category: 'membership', isMembership: true, displayLabel: membership.primary };
        }
        if (giftType === 'milestonechat') {
            return {
                ...base, kind: 'membership_event', category: 'membership', isMembership: true,
                displayLabel: membership.primary || 'メンバーシップ',
                announcementText: messageText ? '' : (membership.sub || membership.primary),
                shouldShowMessage: !!messageText
            };
        }
        if (membership.active) {
            return {
                ...base, kind: 'membership_event', category: 'membership', isMembership: true,
                displayLabel: membership.primary || 'メンバーシップ',
                announcementText: messageText ? '' : (membership.sub || membership.primary),
                shouldShowMessage: !!messageText
            };
        }
        if (monetization.present) return { ...base, kind: 'unknown', category: 'support', isSupport: true, displayLabel: monetization.gift.label || 'ギフト' };
        return base;
    }

    function normalize(raw, options = {}) {
        const safeRaw = raw && typeof raw === 'object' ? raw : {};
        const data = payloadOf(safeRaw);
        const membershipData = data?.membership || {};
        // speechTextは読み上げ用の加工済み文字列であり、表示本文には使用しない。
        const messageHtml = firstNonEmpty([data?.comment, data?.text, data?.message, data?.body]);

        // 元本文はここで一度だけ解析する。
        const messageContent = parseHtml(messageHtml);
        const translatedHtml = stringValue(data?.translated).trim();
        const translatedContent = translatedHtml ? parseHtml(translatedHtml) : { text: '', parts: [], imageUrls: [] };
        const giftType = stringValue(data?.giftType || safeRaw?.type).trim().toLowerCase();
        const firstGiftImage = messageContent.parts.find((part) => part.type === 'emoji' && part.isSticker) || {};
        const giftLabel = firstNonEmpty([
            giftType === 'jewel' ? jewelLabel(messageContent.text) : '',
            data?.giftLabel,
            data?.attachmentLabel,
            firstGiftImage.alt
        ]).trim();
        const giftImageUrl = firstNonEmpty([data?.giftImageUrl, data?.attachmentImageUrl, firstGiftImage.url]).trim();
        const isJewel = giftType === 'jewel';
        const isMembershipGift = giftType === 'sponsorgift' || !!data?.isSponsorshipGiftSender;
        const isGiftReceiver = giftType === 'giftreceived' || !!data?.isSponsorshipGiftReceiver;
        const money = moneyInfo(safeRaw, data, isJewel || isMembershipGift);
        const parsedJewelCount = isJewel ? jewelCount(data, messageContent.text) : 0;
        const jewels = {
            available: parsedJewelCount > 0,
            count: parsedJewelCount,
            unit: 'jewel'
        };
        const giftCount = membershipGiftCount(data, messageContent.text);
        const membership = {
            active: !!data?.membership || isMembershipGift || isGiftReceiver,
            primary: stringValue(membershipData.primary),
            sub: stringValue(membershipData.sub),
            milestone: membershipData.milestone ?? null,
            giftCount,
            isGiftSender: isMembershipGift,
            isGiftReceiver
        };
        const monetization = {
            present: !!data?.hasGift || !!giftType || money.available || jewels.available,
            kind: giftType,
            money,
            jewels,
            gift: { type: giftType, label: giftLabel, imageUrl: giftImageUrl, hasImage: !!giftImageUrl }
        };

        const colors = data?.colors || safeRaw?.payload?.data?.colors || safeRaw?.colors;
        const useUserColor = options.useUserColor ?? (global.CONFIG?.USE_USER_COLOR !== false);
        let color = colors && (parseColor(colors.headerBackgroundColor) || parseColor(colors.bodyBackgroundColor) || parseColor(colors.bodyTextColor));
        if (!data?.hasGift && !useUserColor) color = { ...DEFAULT_COLOR };
        if (!usableColor(color)) color = parseColor(safeRaw?.color) || parseColor(safeRaw?.payload?.color) || parseColor(data?.color);
        if (!usableColor(color)) color = { ...DEFAULT_COLOR };

        const badges = Array.isArray(data?.badges) ? data.badges : [];
        const result = {
            id: stringValue(data?.id || safeRaw?.id) || `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            service: {
                id: stringValue(safeRaw?.service?.id || safeRaw?.service),
                name: stringValue(safeRaw?.service?.name || safeRaw?.service?.id || safeRaw?.service)
            },
            message: {
                text: messageContent.text,
                html: messageHtml,
                parts: messageContent.parts,
                imageUrls: messageContent.imageUrls,
                command: parseCommand(messageContent.text),
                translation: {
                    available: !!translatedHtml,
                    text: translatedContent.text,
                    html: translatedHtml,
                    parts: translatedContent.parts,
                    imageUrls: translatedContent.imageUrls,
                    source: translatedHtml ? 'youtube_auto_translation' : '',
                    visibility: translatedHtml ? 'owner_only' : ''
                }
            },
            user: {
                id: stringValue(data?.userId),
                name: stringValue(data?.name || 'Anonymous'),
                displayName: stringValue(data?.displayName || data?.name || 'Anonymous'),
                screenName: stringValue(data?.screenName),
                profileImage: stringValue(data?.profileImage || data?.originalProfileImage),
                originalProfileImage: stringValue(data?.originalProfileImage || data?.profileImage),
                badges,
                roles: { owner: !!(data?.isOwner || data?.isBroadcaster), moderator: !!data?.isModerator, member: !!data?.isMember },
                traits: { anonymous: !!data?.isAnonymous, firstTime: !!data?.isFirstTime, repeater: !!data?.isRepeater }
            },
            monetization,
            membership,
            event: null,
            style: { color, colorString: `rgb(${color.r}, ${color.g}, ${color.b})` },
            system: { sticky: !!data?.isSticky }
        };
        result.event = eventInfo({ giftType, messageText: messageContent.text, membership, monetization });
        if (options.includeRaw === true) result.raw = raw;
        return result;
    }

    global.VCT_SDK = Object.freeze({ VERSION, normalize });
})(window);
