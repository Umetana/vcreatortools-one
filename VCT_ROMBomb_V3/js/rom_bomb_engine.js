// MIT Copyright (c) 2026 Umetana
// 受信・DOM・保存から独立した監視サイクル。時刻を引数で渡して検証できる。
(function (root) {
  'use strict';
  class RomBombEngine {
    constructor(config, now = Date.now()) {
      this.config = { ...config };
      this.setReleaseWords(config);
      this.startedAt = now;
      this.listeners = new Map();
      this.seen = new Map();
      this.effects = new Map();
      this.visible = new Set();
      this.pausedAt = config.ENABLED ? null : now;
      this.pauseTotal = 0;
      this.sequence = 0;
    }
    activeTime(now) {
      return (this.pausedAt ?? now) - this.pauseTotal;
    }
    retention() {
      return Math.max((this.config.START_MIN + this.config.EXPLODE_MIN) * 60000, 1200000) + 60000;
    }
    setReleaseWords(config) {
      const words = config.RELEASE_MODE === 'deny' ? config.RELEASE_DENY_WORDS : config.RELEASE_ALLOW_WORDS;
      this.releaseWords = new Set((words || '').split(/\r?\n/).map(word => word.trim()).filter(Boolean));
    }
    canRelease(text) {
      const matches = this.releaseWords.has(typeof text === 'string' ? text.trim() : '');
      if (this.config.RELEASE_MODE === 'deny') return !matches;
      if (this.config.RELEASE_MODE === 'allow') return matches;
      return true;
    }
    configure(config, now) {
      const wasEnabled = this.config.ENABLED;
      if (wasEnabled && !config.ENABLED) this.pausedAt = now;
      if (!wasEnabled && config.ENABLED) {
        this.pauseTotal += Math.max(0, now - this.pausedAt);
        this.pausedAt = null;
      }
      this.config = { ...config };
      this.setReleaseWords(config);
      for (const [key, user] of this.listeners) {
        if (user.moderator && !config.INCLUDE_MODERATORS) {
          this.listeners.delete(key);
          this.effects.delete(key);
          this.visible.delete(key);
        }
      }
      for (const [key, effect] of this.effects) {
        if ((effect.status === 'exploding' && !config.EXPLOSION_EFFECT) ||
            (effect.status === 'released' && !config.RELEASE_EFFECT) ||
            (effect.moderator && !config.INCLUDE_MODERATORS)) this.effects.delete(key);
      }
    }
    receive(comment, now) {
      // IDや時刻が欠けるイベントは履歴・本人判定を保証できないため受け付けない。
      if (!comment || !comment.id || !comment.userId || !comment.service ||
          !Number.isFinite(comment.timestamp) || comment.timestamp < this.startedAt ||
          comment.timestamp < now - this.retention() || comment.timestamp > now + 60000 || comment.system) return false;
      const key = JSON.stringify([comment.service, comment.userId]);
      const eventId = JSON.stringify([comment.service, comment.id]);
      if (this.seen.has(eventId)) return false;
      this.seen.set(eventId, now);
      if (comment.owner || (comment.moderator && !this.config.INCLUDE_MODERATORS)) {
        this.listeners.delete(key);
        this.effects.delete(key);
        this.visible.delete(key);
        return false;
      }
      const previous = this.listeners.get(key);
      // 一度でも登場した爆弾は、枠外・一時停止中も解除条件を保つ。
      // 不一致でもseenには記録し、再送や設定変更で同じコメントを再判定しない。
      if (previous?.bombStartedAt != null && !this.canRelease(comment.text)) return false;
      const silentElapsed = previous ? Math.max(0, this.activeTime(now) - previous.lastActiveAt) : 0;
      const elapsed = previous?.bombStartedAt != null ? Math.max(0, this.activeTime(now) - previous.bombStartedAt) : 0;
      // 同一ユーザーの古い演出を消してから新サイクルを作る。終了時の再登録削除を防ぐ。
      this.effects.delete(key);
      if (previous && this.visible.has(key) && this.config.RELEASE_EFFECT) {
        this.effects.set(key, { ...previous, elapsed, silentElapsed, status: 'released', until: now + 650 });
      }
      this.listeners.set(key, {
        key, generation: ++this.sequence, name: comment.name || '名無し',
        profileImage: comment.profileImage || '', moderator: !!comment.moderator,
        lastActiveAt: this.activeTime(now), bombStartedAt: null
      });
      this.visible.delete(key);
      return true;
    }
    snapshot(now) {
      for (const [id, at] of this.seen) if (now - at > this.retention()) this.seen.delete(id);
      for (const [key, effect] of this.effects) if (now >= effect.until) this.effects.delete(key);
      const active = [];
      const activeNow = this.activeTime(now);
      for (const [key, user] of this.listeners) {
        const silentElapsed = Math.max(0, activeNow - user.lastActiveAt);
        const elapsed = user.bombStartedAt === null ? 0 : Math.max(0, activeNow - user.bombStartedAt);
        // 枠外のまま一度も登場しない人も、待ち時間＋爆発時間で期限切れにする。
        const expired = user.bombStartedAt === null
          ? silentElapsed >= (this.config.START_MIN + this.config.EXPLODE_MIN) * 60000
          : elapsed >= this.config.EXPLODE_MIN * 60000;
        if (this.config.ENABLED && expired) {
          this.listeners.delete(key);
          if (this.visible.has(key) && this.config.EXPLOSION_EFFECT) {
            const duration = this.config.EXPLOSION_SECONDS * 1000;
            this.effects.set(key, { ...user, elapsed, silentElapsed, status: 'exploding', duration, until: now + duration });
          }
        } else if (user.bombStartedAt !== null || silentElapsed >= this.config.START_MIN * 60000) {
          active.push({ ...user, elapsed, silentElapsed, status: 'active' });
        }
      }
      const order = (a, b) => b.silentElapsed - a.silentElapsed || a.generation - b.generation;
      const effects = [...this.effects.values()].sort(order).slice(0, this.config.MAX_ITEMS);
      const held = new Set(effects.map(user => user.key));
      const selected = active.filter(user => !held.has(user.key)).sort(order).slice(0, this.config.MAX_ITEMS - effects.length);
      for (const row of selected) {
        if (row.bombStartedAt === null) {
          row.bombStartedAt = activeNow;
          this.listeners.get(row.key).bombStartedAt = activeNow;
        }
      }
      this.visible = new Set(selected.map(user => user.key));
      return [...effects, ...selected].sort(order).map(user => ({
        ...user, stage: user.elapsed >= this.config.DANGER_MIN * 60000 ? 2 : user.elapsed >= this.config.WARN_MIN * 60000 ? 1 : 0
      }));
    }
    clear() {
      this.listeners.clear();
      this.effects.clear();
      this.visible.clear();
      // seenは保持し、クリア直後の再送で再登録されることを防ぐ。
    }
  }
  if (typeof module === 'object' && module.exports) module.exports = RomBombEngine;
  else root.RomBombEngine = RomBombEngine;
})(typeof window === 'object' ? window : globalThis);
