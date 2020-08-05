import { Connection } from "typeorm";

export interface TgdContext {
  requestId: number;
  typeormConnection?: Connection;
}
