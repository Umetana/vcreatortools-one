/**
 * V-Creator Tools: OneComme Core SDK (VCT) v1.2.2
 * 
 * 共通のコメント解析ロジックを提供し、各テンプレートのコードを簡略化します。
 */

window.VCT = (function () {
    const VERSION = '1.2.2';
    const DEFAULT_COLOR = { r: 255, g: 255, b: 255 };

    /**
     * HTML文字列をパースし、テキストと画像（絵文字）に分解する
     */
    function parseHtml(html) {
        if (!html) return { text: "", imgUrls: [], parts: [] };
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const parts = [];
        const imgUrls = [];

        function walk(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const content = node.textContent;
                if (content) parts.push({ type: 'text', content });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                    const url = node.dataset.src || node.src;
                    const isSticker = node.classList.contains('gift-sticker') || node.classList.contains('gift-image');
                    parts.push({ type: 'emoji', url, alt: node.alt || '', isSticker });
                    imgUrls.push(url);
                } else if (node.tagName === 'BR') {
                    parts.push({ type: 'text', content: '\n' });
                } else {
                    node.childNodes.forEach(walk);
                }
            }
        }

        doc.body.childNodes.forEach(walk);

        // FX用のプレーンテキスト（画像を除外）
        const plainText = parts
            .filter(p => p.type === 'text')
            .map(p => p.content)
            .join("")
            .trim();

        return {
            text: plainText,
            imgUrls,
            parts
        };
    }

    /**
     * 色情報の文字列/オブジェクトを分解して {r, g, b} オブジェクトにする
     */
    function parseColor(val) {
        if (!val) return null;
        if (typeof val === 'object' && val.r !== undefined) return val;
        if (typeof val !== 'string') return null;

        const rgba = val.match(/rgba?\(\s*(\d+)(?:\s*,\s*|\s+)(\d+)(?:\s*,\s*|\s+)(\d+)/i);
        if (rgba) return { r: parseInt(rgba[1]), g: parseInt(rgba[2]), b: parseInt(rgba[3]) };

        const hex = val.match(/#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
        if (hex) return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) };

        return null;
    }

    const isBlack = (col) => col && col.r === 0 && col.g === 0 && col.b === 0;

    /**
     * 先頭の !command を抽出し、本文と分離する
     */
    function parseLeadingCommand(text) {
        const source = typeof text === 'string' ? text.trim() : '';
        const match = source.match(/^!([^\s!]+)(?:\s+([\s\S]*))?$/u);

        if (!match) {
            return {
                exists: false,
                name: '',
                body: '',
                fullText: source
            };
        }

        return {
            exists: true,
            name: match[1],
            body: (match[2] || '').trim(),
            fullText: source
        };
    }

    function parseAmountValue(value) {
        if (value == null) return 0;

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        if (typeof value === 'object') {
            return parseAmountValue(value.amount ?? value.value ?? value.price ?? value.text);
        }

        const normalized = String(value).replace(/,/g, '').trim();
        const match = normalized.match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : 0;
    }

    function getCommentPayload(commentData) {
        const raw = commentData?.raw || {};
        const data = raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw;
        return { raw, data };
    }

    function pickMessageSource(data) {
        const candidates = [
            data?.comment,
            data?.text,
            data?.message,
            data?.body,
            data?.speechText
        ];

        const found = candidates.find(value => String(value ?? '').trim());
        return found ?? "";
    }

    function extractFirstImageInfo(html) {
        if (!html) return { url: '', alt: '' };

        try {
            const doc = new DOMParser().parseFromString(String(html), 'text/html');
            const img = doc.querySelector('img');
            if (!img) return { url: '', alt: '' };

            return {
                url: img.dataset.src || img.getAttribute('src') || '',
                alt: img.getAttribute('alt') || ''
            };
        } catch (err) {
            return { url: '', alt: '' };
        }
    }

    function resolveSupportGift(support) {
        const { raw, data } = getCommentPayload(support);
        const imageInfo = extractFirstImageInfo(data?.comment || data?.message || '');
        const type = String(support?.giftType || support?.rawType || data?.giftType || raw?.type || '').trim();
        const label = String(
            support?.giftLabel ||
            support?.attachmentLabel ||
            data?.speechText ||
            imageInfo.alt ||
            ''
        ).trim();
        const imageUrl = String(
            support?.giftImageUrl ||
            support?.attachmentImageUrl ||
            data?.giftImageUrl ||
            imageInfo.url ||
            ''
        ).trim();

        return {
            type,
            label,
            imageUrl,
            hasImage: !!imageUrl
        };
    }

    function extractSupportAmount(commentData) {
        const { raw, data } = getCommentPayload(commentData);
        const candidates = [
            commentData?.price,
            data?.price,
            data?.paidAmount,
            data?.amount,
            data?.money,
            raw?.price,
            raw?.payload?.price,
            raw?.payload?.data?.price,
            raw?.payload?.data?.money
        ];

        for (const candidate of candidates) {
            const amount = parseAmountValue(candidate);
            if (amount > 0) {
                return amount;
            }
        }

        const paidText = data?.paidText || raw?.payload?.data?.paidText || '';
        return parseAmountValue(paidText);
    }

    function extractSupportCurrency(commentData) {
        const { raw, data } = getCommentPayload(commentData);
        return data?.currency || data?.money?.currency || raw?.currency || '';
    }

    function formatEventAmount(monetization) {
        if (monetization?.paidText) return monetization.paidText;

        const amount = monetization?.amount || 0;
        if (amount <= 0) return '';

        const currency = monetization?.currency || '';
        if (currency === 'JPY') return `¥${amount.toLocaleString()}`;
        return currency ? `${amount.toLocaleString()} ${currency}` : String(amount);
    }

    function extractMembershipGiftCount(core) {
        const { data } = getCommentPayload({ raw: core?.raw });
        const giftType = String(data?.giftType || '').toLowerCase();

        if (giftType !== 'sponsorgift' && !data?.isSponsorshipGiftSender) {
            return 0;
        }

        const priceCount = parseAmountValue(data?.price);
        if (priceCount > 0) return priceCount;

        const sourceText = [
            core?.message?.text,
            data?.speechText,
            data?.comment
        ].filter(Boolean).join(' ');

        const match = sourceText.match(/(\d+)\s*個/u);
        return match ? Number(match[1]) : 0;
    }

    function classifyEvent(core) {
        const { data } = getCommentPayload({ raw: core?.raw });
        const giftType = String(data?.giftType || core?.monetization?.gift?.type || core?.monetization?.kind || '').toLowerCase();
        const rawComment = pickMessageSource(data);
        const userText = parseHtml(rawComment).text;
        const amountText = formatEventAmount(core?.monetization);
        const membership = core?.membership || {};
        const badges = core?.user?.badges || [];

        const base = {
            kind: 'normal',
            category: 'comment',
            isSupport: false,
            isMembership: false,
            isGiftSender: false,
            isGiftReceiver: false,
            giftCount: 0,
            displayLabel: '',
            shouldShowMessage: true
        };

        if (giftType === 'superchat') {
            return {
                ...base,
                kind: 'superchat',
                category: 'support',
                isSupport: true,
                displayLabel: amountText || 'スパチャ'
            };
        }

        if (giftType === 'supersticker') {
            return {
                ...base,
                kind: 'supersticker',
                category: 'support',
                isSupport: true,
                displayLabel: amountText || 'ステッカー'
            };
        }

        if (giftType === 'sponsorgift' || data?.isSponsorshipGiftSender) {
            const giftCount = extractMembershipGiftCount(core);
            return {
                ...base,
                kind: 'membership_gift',
                category: 'membership',
                isMembership: true,
                isGiftSender: true,
                giftCount,
                displayLabel: giftCount > 0 ? `メンバーシップギフト ${giftCount}件` : 'メンバーシップギフト',
                shouldShowMessage: true
            };
        }

        if (giftType === 'giftreceived' || data?.isSponsorshipGiftReceiver) {
            return {
                ...base,
                kind: 'membership_gift_received',
                category: 'membership',
                isMembership: true,
                isGiftReceiver: true,
                displayLabel: 'メンバーシップギフト受取',
                shouldShowMessage: false
            };
        }

        if (giftType === 'milestonechat') {
            const primary = membership.primary || '';
            const sub = membership.sub || '';
            const badgeLabels = badges.map(badge => badge?.label || '').join(' ');
            const isJoin = /新規メンバー|へようこそ|ようこそ|Welcome/i.test(`${primary} ${sub} ${badgeLabels}`);

            if (isJoin && !userText) {
                return {
                    ...base,
                    kind: 'member_join',
                    category: 'membership',
                    isMembership: true,
                    displayLabel: '新規メンバー',
                    shouldShowMessage: true
                };
            }

            if (primary && userText) {
                return {
                    ...base,
                    kind: 'member_milestone',
                    category: 'membership',
                    isMembership: true,
                    displayLabel: primary,
                    shouldShowMessage: true
                };
            }

            return {
                ...base,
                kind: 'membership_event',
                category: 'membership',
                isMembership: true,
                displayLabel: primary || sub || 'メンバーシップ',
                shouldShowMessage: !!core?.message?.text
            };
        }

        if (membership.active || membership.primary || membership.sub) {
            const primary = membership.primary || '';
            const sub = membership.sub || '';
            const badgeLabels = badges.map(badge => badge?.label || '').join(' ');
            const isJoin = /新規メンバー|へようこそ|ようこそ|Welcome/i.test(`${primary} ${sub} ${badgeLabels}`);

            if (isJoin) {
                return {
                    ...base,
                    kind: 'member_join',
                    category: 'membership',
                    isMembership: true,
                    displayLabel: '新規メンバー',
                    shouldShowMessage: true
                };
            }

            return {
                ...base,
                kind: 'membership_event',
                category: 'membership',
                isMembership: true,
                displayLabel: primary || sub || 'メンバーシップ',
                shouldShowMessage: !!core?.message?.text
            };
        }

        if (core?.monetization?.hasGift) {
            return {
                ...base,
                kind: 'unknown',
                category: 'support',
                isSupport: true,
                displayLabel: core?.monetization?.gift?.label || 'ギフト'
            };
        }

        return base;
    }

    function escapeRegExp(text) {
        return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getDisplayMessage(commentData) {
        const { raw, data } = getCommentPayload(commentData);
        const paidText = String(data?.paidText || raw?.payload?.data?.paidText || '').trim();
        const sourceText = String(commentData?.text || '').trim();

        if (!sourceText || !paidText) {
            return sourceText;
        }

        const suffixPattern = new RegExp(`\\s*${escapeRegExp(paidText)}\\s*$`);
        return sourceText.replace(suffixPattern, '').trim();
    }

    function resolveNow(options = {}) {
        return typeof options.now === 'function' ? options.now() : Date.now();
    }

    function isCoreComment(commentData) {
        return !!(commentData?.message && commentData?.monetization && commentData?.event);
    }

    function ensureCoreComment(commentData) {
        if (isCoreComment(commentData)) {
            return commentData;
        }

        return parseCore(commentData?.raw || commentData);
    }

    function buildUserProfileRecord(commentData, options = {}) {
        const core = ensureCoreComment(commentData);
        const { raw, data } = getCommentPayload({ raw: core.raw });
        const now = resolveNow(options);

        return {
            platform: core.service?.id || raw?.service?.id || raw?.service || '',
            userId: core.user?.id || data?.userId || '',
            userName: core.user?.displayName || 'Anonymous',
            displayName: core.user?.displayName || data?.displayName || data?.name || '',
            screenName: core.user?.screenName || '',
            userIcon: core.user?.profileImage || '',
            originalUserIcon: core.user?.originalProfileImage || core.user?.profileImage || '',
            isMember: !!core.user?.isMember,
            isModerator: !!core.user?.isModerator,
            isOwner: !!core.user?.isOwner,
            streamId: options.streamId || '',
            eventAt: data?.timestamp || raw?.ts || null,
            updatedAt: now,
            rawProfile: raw
        };
    }

    function buildSupportRecord(commentData, options = {}) {
        const core = ensureCoreComment(commentData);
        const { raw, data } = getCommentPayload({ raw: core.raw });
        const amount = core.monetization?.amount || 0;

        if (!core.event?.isSupport || amount <= 0) {
            return null;
        }

        const platform = core.service?.id || raw?.service?.id || raw?.service || '';
        const userId = core.user?.id || data?.userId || '';
        const userName = core.user?.displayName || 'Anonymous';
        const buildUserKey = typeof options.buildUserKey === 'function'
            ? options.buildUserKey
            : () => '';
        const gift = core.monetization?.gift || resolveSupportGift({ raw: core.raw });

        return {
            platform,
            streamId: options.streamId || '',
            originalEventId: data?.id || core.id || '',
            eventAt: data?.timestamp || raw?.ts || null,
            userKey: buildUserKey({ platform, userId, userName }),
            userId,
            userName,
            userIcon: core.user?.profileImage || '',
            amount,
            currency: core.monetization?.currency || '',
            message: getDisplayMessage(toLegacy(core)),
            giftType: gift.type,
            giftLabel: gift.label,
            giftImageUrl: gift.imageUrl,
            supportColor: core.style?.colorStr || '',
            rawType: data?.giftType || raw?.type || '',
            raw
        };
    }

    function parseCore(raw) {
        const data = raw?.data || raw?.payload?.raw?.data || raw?.payload?.data || raw?.raw?.data || raw?.payload || raw;
        const config = window.CONFIG || {};

        // 1. メッセージ本文の取得
        let baseComment = pickMessageSource(data);

        // メンバーシップ等のシステムメッセージ補完
        if (data?.membership) {
            const sysMsg = [data.membership.primary, data.membership.sub].filter(Boolean).join(' ');
            if (!baseComment || (sysMsg && !baseComment.includes(data.membership.sub))) {
                baseComment = sysMsg + (baseComment ? `<br>${baseComment}` : "");
            }
        }

        // Legacy互換用の本文は従来通り paidText を末尾へ補完する
        let legacyComment = baseComment;
        if (data?.hasGift && data.paidText && !legacyComment.includes(data.paidText)) {
            legacyComment += ` ${data.paidText}`;
        }

        const baseContent = parseHtml(baseComment);
        const parsedContent = parseHtml(legacyComment);
        const vctCommand = parseLeadingCommand(baseContent.text);
        const gift = resolveSupportGift({ raw });
        const amount = extractSupportAmount({ raw });
        const currency = extractSupportCurrency({ raw });

        // 2. 色の解析
        let color = null;
        const colors = data?.colors || raw?.payload?.data?.colors || raw?.colors;
        const useUserColor = config.USE_USER_COLOR !== false;

        // ギフト系の色を最優先
        if (colors) {
            color = parseColor(colors.headerBackgroundColor) ||
                parseColor(colors.bodyBackgroundColor) ||
                parseColor(colors.bodyTextColor);
        }

        // ユーザー色 or 白
        if (!data?.hasGift && !useUserColor) {
            color = { ...DEFAULT_COLOR };
        } else if (!color || isBlack(color)) {
            const normalColor = parseColor(raw?.color) || parseColor(raw?.payload?.color) || parseColor(data?.color);
            if (normalColor && !isBlack(normalColor)) color = normalColor;
        }

        if (!color || isBlack(color)) color = { ...DEFAULT_COLOR };

        const colorStr = `rgb(${color.r},${color.g},${color.b})`;
        const membershipData = data?.membership || {};

        const core = {
            id: data.id || `${raw.id || 'cmt'}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            service: {
                id: raw?.service?.id || raw?.service || '',
                name: raw?.service?.name || raw?.service?.id || raw?.service || ''
            },
            user: {
                id: data?.userId || '',
                name: data?.name || 'Anonymous',
                displayName: data?.displayName || data?.name || 'Anonymous',
                screenName: data?.screenName || null,
                profileImage: data?.profileImage || data?.originalProfileImage || '',
                originalProfileImage: data?.originalProfileImage || data?.profileImage || '',
                isOwner: !!(data?.isOwner || data?.isBroadcaster),
                isModerator: !!data?.isModerator,
                isMember: !!data?.isMember,
                isAnonymous: !!data?.isAnonymous,
                isFirstTime: !!data?.isFirstTime,
                isRepeater: !!data?.isRepeater,
                badges: data?.badges || []
            },
            message: {
                text: baseContent.text,
                html: baseComment,
                legacyText: parsedContent.text,
                legacyHtml: legacyComment,
                parts: baseContent.parts,
                legacyParts: parsedContent.parts,
                imgUrls: baseContent.imgUrls,
                legacyImgUrls: parsedContent.imgUrls,
                command: vctCommand
            },
            monetization: {
                hasGift: !!data?.hasGift,
                kind: data?.giftType || raw?.type || '',
                paidText: data?.paidText || '',
                amount,
                currency,
                gift
            },
            membership: {
                active: !!data?.membership,
                primary: membershipData.primary || '',
                sub: membershipData.sub || '',
                milestone: membershipData.milestone || null
            },
            system: {
                isSticky: !!data?.isSticky,
                complementedText: data?.membership ? baseContent.text : null
            },
            style: {
                color,
                colorStr
            },
            raw
        };

        core.event = classifyEvent(core);
        return core;
    }

    function toLegacy(core) {
        return {
            id: core.id,
            user: core.user.displayName,
            screenName: core.user.screenName,
            profileImage: core.user.profileImage,
            badges: core.user.badges,
            text: core.message.legacyText,
            parts: core.message.legacyParts,
            imgUrls: core.message.legacyImgUrls,
            vctCommand: core.message.command,
            color: core.style.color,
            colorStr: core.style.colorStr,
            hasGift: core.monetization.hasGift,
            giftType: core.monetization.gift.type,
            giftLabel: core.monetization.gift.label,
            giftImageUrl: core.monetization.gift.imageUrl,
            isSticky: core.system.isSticky,
            membership: core.membership.active,
            isAnonymous: core.user.isAnonymous,
            isFirstTime: core.user.isFirstTime,
            isRepeater: core.user.isRepeater,
            isOwner: core.user.isOwner,
            isModerator: core.user.isModerator,
            raw: core.raw
        };
    }

    function toStructured(core) {
        return {
            id: core.id,
            service: core.service,
            user: {
                id: core.user.id,
                name: core.user.name,
                displayName: core.user.displayName,
                screenName: core.user.screenName,
                profileImage: core.user.profileImage,
                originalProfileImage: core.user.originalProfileImage,
                isOwner: core.user.isOwner,
                isModerator: core.user.isModerator,
                isMember: core.user.isMember,
                isAnonymous: core.user.isAnonymous,
                isFirstTime: core.user.isFirstTime,
                isRepeater: core.user.isRepeater,
                badges: core.user.badges
            },
            message: {
                text: core.message.text,
                html: core.message.html,
                parts: core.message.parts,
                imgUrls: core.message.imgUrls,
                command: core.message.command
            },
            legacy: {
                text: core.message.legacyText,
                html: core.message.legacyHtml,
                parts: core.message.legacyParts,
                imgUrls: core.message.legacyImgUrls
            },
            monetization: {
                hasGift: core.monetization.hasGift,
                kind: core.monetization.kind,
                paidText: core.monetization.paidText,
                amount: core.monetization.amount,
                currency: core.monetization.currency,
                gift: core.monetization.gift
            },
            membership: core.membership,
            system: core.system,
            style: core.style,
            event: core.event,
            raw: core.raw
        };
    }

    /**
     * OneSDKの生データを解析して、Legacy互換オブジェクトに変換する
     */
    function parse(raw) {
        return toLegacy(parseCore(raw));
    }

    /**
     * OneSDKの生データを解析して、用途別に扱いやすい構造化オブジェクトに変換する
     */
    function parseStructured(raw) {
        return toStructured(parseCore(raw));
    }

    return {
        VERSION,
        parse,
        parseStructured,
        parseCore,
        parseHtml,
        parseColor,
        parseLeadingCommand,
        resolveSupportGift,
        extractSupportAmount,
        extractSupportCurrency,
        extractMembershipGiftCount,
        classifyEvent,
        getDisplayMessage,
        buildUserProfileRecord,
        buildSupportRecord
    };
})();
