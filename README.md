# TypeGraphQL-DataLoader

TypeGraphQL-DataLoader is a utility to use DataLoader with TypeGraphQL without fuss.

## Install

```
npm install type-graphql-dataloader
```

The latest build is tested with the following packages:

- type-graphql 1.1.0
- apollo-server-express 2.18.2
- (optional) typeorm 0.2.32

## Getting Started

Apollo Server is the first-class supported server. If your application uses Apollo Server, pass `ApolloServerLoaderPlugin()` as a plugin when instantiating the server. This plugin is for set-up and clean-up against each request.

```ts
import { ApolloServerLoaderPlugin } from "type-graphql-dataloader";
import { getConnection } from "typeorm";

...

const apollo = new ApolloServer({
  schema,
  plugins: [
    ApolloServerLoaderPlugin({
      typeormGetConnection: getConnection,  // for use with TypeORM
    }),
  ],
});

...
```

### With TypeORM

TypeORM is the first-class supported ORM. If your application uses TypeORM with TypeGraphQL, adding `@TypeormLoader` decorator to relation properties will solve N + 1 problem. When the fields are accessed by graphQL, batch loading will be performed using DataLoader under the hood.

```ts
import { ObjectType, Field, ID } from "type-graphql";
import { TypeormLoader } from "type-graphql-dataloader";
import { Entity, PrimaryGeneratedColumn, ManyToOne, RelationId } from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Photo {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field((type) => User)
  @ManyToOne((type) => User, (user) => user.photos)
  @TypeormLoader()
  user: User;
}
```

```ts
import { ObjectType, Field, ID } from "type-graphql";
import { TypeormLoader } from "type-graphql-dataloader";
import { Entity, PrimaryGeneratedColumn, OneToMany, RelationId } from "typeorm";
import { Photo } from "./Photo";

@ObjectType()
@Entity()
export class User {
  @Field((type) => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field((type) => [Photo])
  @OneToMany((type) => Photo, (photo) => photo.user)
  @TypeormLoader()
  photos: Photo[];
}
```

`@TypeormLoader` does not need arguments since `v0.4.0`. In order to pass foeign key explicitly, arguments are still supported. Take a look at previous [README](https://github.com/slaypni/type-graphql-dataloader/blob/v0.3.7/README.md#with-typeorm) for details.

### With Custom DataLoader

It is possible to assign custom DataLoader to a field by adding `@Loader` decorator to the corresponding method with `@FieldResolver`. `@Loader` takes a batch load function which is passed to the DataLoader constructor. The decorated method should return a function which takes a DataLoader instance and returns Promise of loaded value(s).

```ts
import DataLoader from "dataloader";
import { groupBy } from "lodash";
import { Resolver, Query, FieldResolver, Root } from "type-graphql";
import { Loader } from "type-graphql-dataloader";
import { getRepository, In } from "typeorm";
import { Photo } from "./Photo";
import { User } from "./User";

@Resolver((of) => User)
export default class UserResolver {

  ...

  @FieldResolver()
  @Loader<number, Photo[]>(async (ids, { context }) => {  // batchLoadFn
    const photos = await getRepository(Photo).find({
      where: { user: { id: In([...ids]) } },
    });
    const photosById = groupBy(photos, "userId");
    return ids.map((id) => photosById[id] ?? []);
  })
  photos(@Root() root: User) {
    return (dataloader: DataLoader<number, Photo[]>) =>
      dataloader.load(root.id);
  }
}
```
