import type { TgdContext } from "#/types/TgdContext";
import type { ApolloServerPlugin } from "@apollo/server";
import { Container } from "typedi";
import type { Connection } from "typeorm";
import { v4 as uuidv4 } from "uuid";

interface ApolloServerLoaderPluginOption {
  typeormGetConnection?: () => Connection;
}

const ApolloServerLoaderPlugin = (
  option?: ApolloServerLoaderPluginOption
): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    async didResolveSource(requestContext: any) {
      let targetProp = "context";
      if (requestContext?.contextValue) {
        targetProp = "contextValue";
      }
      Object.assign(requestContext[targetProp], {
        _tgdContext: {
          requestId: uuidv4(),
          typeormGetConnection: option?.typeormGetConnection,
        } as TgdContext,
      });
    },
    async willSendResponse(requestContext: any) {
      let targetProp = "context";
      if (requestContext?.contextValue) {
        targetProp = "contextValue";
      }
      Container.reset(requestContext[targetProp]._tgdContext.requestId);
    },
  }),
});

export { ApolloServerLoaderPlugin };
