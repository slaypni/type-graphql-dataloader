import { Container } from "typedi";
import type { Connection } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { TgdContext } from "#/types/TgdContext";

interface ApolloServerLoaderPluginOption {
  typeormGetConnection?: () => Connection;
}

const ApolloServerLoaderPlugin = (option?: ApolloServerLoaderPluginOption) => ({
  requestDidStart: () => ({
    didResolveSource(requestContext: { context: Record<string, any> }) {
      Object.assign(requestContext.context, {
        _tgdContext: {
          requestId: uuidv4(),
          typeormGetConnection: option?.typeormGetConnection,
        } as TgdContext,
      });
    },
    willSendResponse(requestContext: { context: Record<string, any> }) {
      Container.reset(requestContext.context._tgdContext.requestId);
    },
  }),
});

export { ApolloServerLoaderPlugin };
