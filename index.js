const cors = require("micro-cors")();
const { ApolloServer, gql } = require("apollo-server-micro");
const { prisma } = require("./prisma/generated/prisma-client");

const typeDefs = gql`
  type User {
    id: ID!
    email: String
    password: String!
    name: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    published: Boolean!
    description: String!
    author: User
  }

  type Query {
    publishedPosts: [Post!]!
    post(postId: ID!): Post
    postsByUser(userId: ID!): [Post!]!
    users: [User!]!
  }

  type Mutation {
    signUp(email: String, password: String, name: String!): User
    createDraft(description: String!): Post
    publishPost(postId: ID!): Post
  }
`;

const resolvers = {
  Query: {
    publishedPosts: (root, args, context) => {
      return context.prisma.posts({ where: { published: true } });
    },
    users: (root, args, context) => {
      return context.prisma.users();
    }
  },
  Mutation: {
    signUp: (root, args, context) => {
      return context.prisma.createUser({
        email: args.email,
        password: args.password,
        name: args.name
      });
    },
    createDraft: (root, args, context) => {
      return context.prisma.createPost({
        description: args.description,
        author: {
          connect: { id: args.userId }
        }
      });
    },
    publishPost: (root, args, context) => {
      return context.prisma.updatePost({
        where: { id: args.postId },
        data: { published: true }
      });
    }
  },
  User: {
    posts: (root, args, context) => {
      return context.prisma
        .user({
          id: root.id
        })
        .posts();
    }
  },
  Post: {
    author: (root, args, context) => {
      return context.prisma
        .post({
          id: root.id
        })
        .author();
    }
  }
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  context: ({ req }) => {
    const token = req.headers.authorization;
    return { token, prisma };
  }
});

module.exports = cors(apolloServer.createHandler());
