import type { TgdContext } from "#/types/TgdContext";
import type {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContextDidResolveSource,
  GraphQLRequestContextWillSendResponse,
} from "@apollo/server";
import { Container } from "typedi";
import type { Connection } from "typeorm";
import { v4 as uuidv4 } from "uuid";

interface ApolloServerLoaderPluginOption {
  typeormGetConnection?: () => Connection;
}

const getContext = (
  requestContext:
    | GraphQLRequestContextDidResolveSource<BaseContext>
    | GraphQLRequestContextWillSendResponse<BaseContext>
) =>
  requestContext?.contextValue
    ? requestContext.contextValue
    : /* @ts-ignore */
      requestContext.context;

const ApolloServerLoaderPlugin = (
  option?: ApolloServerLoaderPluginOption
): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    async didResolveSource(requestContext) {
      Object.assign(getContext(requestContext), {
        _tgdContext: {
          requestId: uuidv4(),
          typeormGetConnection: option?.typeormGetConnection,
        } as TgdContext,
      });
    },
    async willSendResponse(requestContext) {
      Container.reset(getContext(requestContext)._tgdContext.requestId);
    },
  }),
});

export { ApolloServerLoaderPlugin };
