import { Connection } from "typeorm";

export interface TgdContext {
  requestId: string;
  typeormGetConnection?: () => Connection;
}
