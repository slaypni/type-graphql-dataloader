# TypeGraphQL-DataLoader

TypeGraphQL-DataLoader is a utility to use DataLoader with TypeGraphQL without fuss.

## Install

```sh

```

The latest build is tested with the following packages:

- type-graphql 1.0.0-rc.3
- (optional) apollo-server-express 2.16.1
- (optional) typeorm 0.2.25

## Getting Started

Apollo Server is the first-class supported server. If your application uses Apollo Server, pass `ApolloServerPlugin()` as a plugin when instantiating the server. This plugin is for set-up and clean-up against each request.

```ts
import { ApolloServerPlugin } from "type-graphql-dataloader";

...

const apollo = new ApolloServer({ schema, plugins: [ApolloServerPlugin()] });

...
```

### With TypeORM

TypeORM is the first-class supported ORM. If your application uses TypeORM with TypeGraphQL, adding `@TypeormLoader` decorator to relation properteis will solve N + 1 problem. When the field is accecced by graphQL, batch loading will be performed using DataLoader under the hood.

`@TypeormLoader` takes a function which returns the target class as the first argument. it requires another function which takes original entity and returns target relation id(s) as the second argument.

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
  @TypeormLoader((type) => User, (photo: Photo) => photo.userId)
  user: User;

  @RelationId((photo: Photo) => photo.user)
  userId: number;
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
  @TypeormLoader((type) => Photo, (user: User) => user.photoIds)
  photos: Photo[];

  @RelationId((user: User) => user.photos)
  photoIds: number[];
}
```

#### Reduce SQL queries further

`selfKey` option can be set `true` against properties which have `@OneToMany` or `@OneToOne` without `@JoinColumn`. If `selfKey` is `true`, the second argument must be a function which takes target entity and returns relation id of the original entity. The use of this functionality may reduce SQL queries because of how TypeORM works.

```ts
@ObjectType()
@Entity()
export class User {

  ...

  @Field((type) => [Photo])
  @OneToMany((type) => Photo, (photo) => photo.user)
  @TypeormLoader((type) => Photo, (photo: Photo) => photo.userId, { selfKey: true })
  photos: Photo[];
}
```

### With Custom DataLoader

It is possible to assign custom DataLoader to a field by adding `@Loader` decorator to the corresponding method with `@FieldResolver`. `@Loader` takes a batch load function which is passed to the DataLoader constructor. The decorated method should return a function which takes a DataLoader instance and returns Promise of loaded value(s).

```ts
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
  @Loader<number, Photo[]>(async (ids) => {
    const photos = await getRepository(Photo).find({
      where: { user: { id: In([...ids]) } },
    });
    const photosById = groupBy(photos, "userId");
    return ids.map((id) => photosById[id] ?? []);
  })
  async photos(@Root() root: User) {
    return (dataloader: DataLoader<number, Photo[]>) =>
      dataloader.load(root.id);
  }
}
```
