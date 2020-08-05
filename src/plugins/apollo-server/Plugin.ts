import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { Container } from "typedi";
import { TgdContext } from "#/types/TgdContext";

const Plugin = () =>
  ({
    requestDidStart: () => ({
      didResolveSource(requestContext) {
        Object.assign(requestContext.context, {
          _tgdContext: {
            requestId: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
          } as TgdContext,
        });
      },
      willSendResponse(requestContext) {
        Container.reset(requestContext.context._tgdContext.requestId);
      },
    }),
  } as ApolloServerPlugin);

export { Plugin };
