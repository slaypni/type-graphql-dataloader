import type { TgdContext } from "#/types/TgdContext";
import type { ApolloServerPlugin } from "apollo-server-plugin-base";
import type { BaseContext } from "apollo-server-types";
import { Container } from "typedi";
import type { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";

interface ApolloServerLoaderPluginOption {
  typeormGetDataSource?: () => DataSource;
}

const ApolloServerLoaderPlugin = (
  option?: ApolloServerLoaderPluginOption
): ApolloServerPlugin => ({
  requestDidStart: async () => ({
    async didResolveSource(requestContext: { context: BaseContext }) {
      Object.assign(requestContext.context, {
        _tgdContext: {
          requestId: uuidv4(),
          typeormGetDataSource: option?.typeormGetDataSource,
        } as TgdContext,
      });
    },
    async willSendResponse(requestContext: { context: BaseContext }) {
      Container.reset(requestContext.context._tgdContext.requestId);
    },
  }),
});

export { ApolloServerLoaderPlugin };
