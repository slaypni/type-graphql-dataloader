import type { Connection } from "typeorm";

export interface TgdContext {
  requestId: string;
  typeormGetConnection?: () => Connection;
}
