import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { Container } from "typedi";
import { Connection } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { TgdContext } from "#/types/TgdContext";

interface ApolloServerLoaderPluginOption {
  typeormGetConnection?: () => Connection;
}

const ApolloServerLoaderPlugin = (option?: ApolloServerLoaderPluginOption) =>
  ({
    requestDidStart: () => ({
      didResolveSource(requestContext) {
        Object.assign(requestContext.context, {
          _tgdContext: {
            requestId: uuidv4(),
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
