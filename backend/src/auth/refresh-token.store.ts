export type RefreshRecord = { userId: string; expiresAt: number };

class RefreshTokenStore {
  private store = new Map<string, RefreshRecord>();

  create(userId: string, ttlMs: number) {
    const token = cryptoRandom(64);
    const rec: RefreshRecord = { userId, expiresAt: Date.now() + ttlMs };
    this.store.set(token, rec);
    return token;
  }

  rotate(oldToken: string, ttlMs: number) {
    const rec = this.store.get(oldToken);
    if (!rec) return null;
    if (Date.now() > rec.expiresAt) {
      this.store.delete(oldToken);
      return null;
    }
    this.store.delete(oldToken);
    const token = cryptoRandom(64);
    this.store.set(token, {
      userId: rec.userId,
      expiresAt: Date.now() + ttlMs,
    });
    return { token, userId: rec.userId };
  }

  get(token: string) {
    const rec = this.store.get(token);
    if (!rec) return null;
    if (Date.now() > rec.expiresAt) {
      this.store.delete(token);
      return null;
    }
    return rec;
  }
}

function cryptoRandom(len: number) {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const refreshTokenStore = new RefreshTokenStore();
