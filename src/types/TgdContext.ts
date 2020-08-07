import { Connection } from "typeorm";

export interface TgdContext {
  requestId: number;
  typeormGetConnection?: () => Connection;
}
