import type { DataSource } from "typeorm";

export interface TgdContext {
  requestId: string;
  typeormGetDataSource?: () => DataSource;
}
