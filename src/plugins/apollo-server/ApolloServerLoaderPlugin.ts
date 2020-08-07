import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { Container } from "typedi";
import { TgdContext } from "#/types/TgdContext";
import { Connection } from "typeorm";

interface ApolloServerLoaderPluginOption {
  typeormGetConnection?: () => Connection;
}

const ApolloServerLoaderPlugin = (option?: ApolloServerLoaderPluginOption) =>
  ({
    requestDidStart: () => ({
      didResolveSource(requestContext) {
        Object.assign(requestContext.context, {
          _tgdContext: {
            requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
            typeormGetConnection: option?.typeormGetConnection,
          } as TgdContext,
        });
      },
      willSendResponse(requestContext) {
        Container.reset(requestContext.context._tgdContext.requestId);
      },
    }),
  } as ApolloServerPlugin);

export { ApolloServerLoaderPlugin };
