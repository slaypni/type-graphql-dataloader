import type { TgdContext } from "#/types/TgdContext";
import type { ApolloServerPlugin, BaseContext } from "@apollo/server";
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
    async didResolveSource(requestContext: { contextValue: BaseContext }) {
      Object.assign(requestContext.contextValue, {
        _tgdContext: {
          requestId: uuidv4(),
          typeormGetConnection: option?.typeormGetConnection,
        } as TgdContext,
      });
    },
    async willSendResponse(requestContext: {
      contextValue: BaseContext & Record<string, any>;
    }) {
      Container.reset(requestContext.contextValue._tgdContext.requestId);
    },
  }),
});

export { ApolloServerLoaderPlugin };
