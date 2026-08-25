import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  readonly client: Redis;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST', '127.0.0.1');
    const port = Number(
      config.get<string>('REDIS_PORT') ?? '6379',
    );

    const password = config.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      enableOfflineQueue: false,
    });

    this.client.on('ready', () => {
      this.logger.log(`Redis ready at ${host}:${port}`);
    });

    this.client.on('error', (error: Error) => {
      this.logger.warn(
        `Redis unavailable: ${error.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}