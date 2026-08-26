import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

export const VELOCITY_COUNTER = Symbol('VELOCITY_COUNTER');

/**
 * count() returns attempts INCLUDING the current one. Both implementations
 * must honour that or the Redis and Postgres paths disagree.
 */

/**
 * The file implemetns a redis db for storing timestamps associated with card attempts
 * Redis flow - key (merchantId, fingerprint) -> an sorted redis set (Z) {member: "ts:UUid" -> score: timestamp}
 * if redis fails, payment need not stop redis should be for optimisation not sole reliability 
 * Postgres backup in PrismaVelocityCounter if redis is down or fails.
 */
export interface VelocityCounter {
  record(merchantId: string, fingerprint: string, at: Date): Promise<void>;
  count(merchantId: string, fingerprint: string, now: Date, windowMs: number): Promise<number>;
}

const TRIM_MS = 15 * 60 * 1000;
const key = (m: string, f: string) => `vp:velocity:${m}:${f}`;

@Injectable()
export class RedisVelocityCounter implements VelocityCounter {
  constructor(private readonly redis: RedisService) {}

  async record(merchantId: string, fingerprint: string, at: Date): Promise<void> {
    // TODO 1: three commands, one round trip
    //   const k = key(merchantId, fingerprint);
    //   const ts = at.getTime();
    //   await this.redis.client.multi()
    //     .zadd(k, ts, `${ts}:${randomUUID()}`)
    //     .zremrangebyscore(k, 0, ts - TRIM_MS)
    //     .pexpire(k, TRIM_MS)
    //     .exec();
    const k = key(merchantId, fingerprint);
    const ts = at.getTime();
    await this.redis.client.multi()
        .zadd(k, ts, `${ts}:${randomUUID()}`)
        .zremrangebyscore(k, 0, ts - TRIM_MS)
        .pexpire(k, TRIM_MS)
        .exec();
    //
    //   zadd     — add this attempt, score = epoch ms
    //   zremrange— drop entries older than the trim window so the set can't grow forever
    //   pexpire  — if this card is never seen again, the key self-deletes
    //   multi()  — one network round trip instead of three
    //
    //   Note `${ts}:${randomUUID()}` as the member: ZSET members must be
    //   unique. Two attempts in the same millisecond would collapse into one
    //   without the UUID.
  }

  async count(merchantId: string, fingerprint: string, now: Date, windowMs: number): Promise<number> {
    // TODO 2: count members scored inside the window
    //   const ts = now.getTime();
    //   return this.redis.client.zcount(key(merchantId, fingerprint), ts - windowMs, ts);
    //
    //   READ ONLY — record() already added the current attempt.
    const ts = now.getTime()
    return this.redis.client.zcount(key(merchantId, fingerprint), ts - windowMs, ts);
  }
}

@Injectable()
export class PrismaVelocityCounter implements VelocityCounter {
  constructor(private readonly prisma: PrismaService) {}

  // TODO 3: record is a no-op — one line, empty body
  //   async record(): Promise<void> {}
  //   The Payment row written at the end of the request IS the record.
  async record(): Promise<void> {}
  

  async count(merchantId: string, fingerprint: string, now: Date, windowMs: number): Promise<number> {
    // TODO 4: count Payment rows in the window, then add one
    //   const since = new Date(now.getTime() - windowMs);
    //   const prior = await this.prisma.payment.count({
    //     where: { merchantId, cardFingerprint: fingerprint,
    //              createdAt: { gte: since, lte: now } },
    //   });
    //   return prior + 1;
    //
    //   The +1 is the contract: the in-flight attempt has no row yet.
    //   This query is exactly what the (cardFingerprint, createdAt) index serves.
    // If redis is inactive, then use postgres 
    const since = new Date(now.getTime() - windowMs)
    const prior = await this.prisma.payment.count({
      where: { merchantId, cardFingerprint: fingerprint, 
        createdAt: {gte: since, lte: now}
      }
    })
    return prior + 1;
  }
}

@Injectable()
export class HybridVelocityCounter implements VelocityCounter {
  private readonly logger = new Logger(HybridVelocityCounter.name);

  constructor(
    private readonly redis: RedisVelocityCounter,
    private readonly db: PrismaVelocityCounter,
  ) {}

  // TODO 5: record — try Redis, swallow the error
  //   async record(merchantId: string, fingerprint: string, at: Date): Promise<void> {
  //     try { await this.redis.record(merchantId, fingerprint, at); }
  //     catch (err) { this.logger.warn(`Redis record failed: ${err}`); }
  //   }
  //   Non-fatal: the Payment row still lands, so the DB path stays correct.
  async record(merchantId: string, fingerprint: string, at: Date): Promise<void> {
    try { await (this.redis.record(merchantId, fingerprint, at)); }
    catch (err) { this.logger.warn(`Redis record failed: ${err}`);}
  }

  // TODO 6: count — try Redis, FALL BACK to Postgres
  //   async count(merchantId, fingerprint, now, windowMs): Promise<number> {
  //     try { return await this.redis.count(...); }
  //     catch (err) { this.logger.warn(...); return this.db.count(...); }
  //   }
  // ensure postgres fallback works 
  async count(merchantId: string, fingerprint: string, now: Date, windowMs: number) : Promise<number> {
    try { return await this.redis.count(merchantId, fingerprint, now, windowMs)}
    catch (err) { this.logger.warn(`...${err}`)
    return this.db.count(merchantId, fingerprint, now, windowMs)
    }
  }
}
  //   THIS IS THE POINT OF THE FILE. The service scores a failed rule as 0
  //   (fail-open). Redis is a separate failure domain from Postgres. Without
  //   this fallback, "Redis is down" and "this card is fine" are
  //   indistinguishable — exactly backwards during an attack.
