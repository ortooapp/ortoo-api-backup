const cors = require("micro-cors")();
const { ApolloServer, gql } = require("apollo-server-micro");
const { prisma } = require("./prisma/generated/prisma-client");
const { hash, compare } = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "secret113";

const typeDefs = gql`
  scalar DateTime

  type User {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    email: String
    password: String!
    name: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    published: Boolean!
    description: String!
    author: User
  }

  type LoginResponse {
    token: String!
    user: User!
  }

  type Query {
    publishedPosts: [Post!]!
    post(postId: ID!): Post
    postsByUser(userId: ID!): [Post!]!
    users: [User!]!
  }

  type Mutation {
    signUp(email: String, password: String, name: String!): User
    signIn(email: String, password: String): LoginResponse
    createDraft(description: String!, userId: ID!): Post
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
    signUp: async (root, args, context) => {
      return context.prisma.createUser({
        email: args.email,
        password: await hash(args.password, 10),
        name: args.name
      });
    },
    signIn: async (root, { email, password }, context) => {
      const user = await context.prisma.user({ email });
      if (!user) {
        throw new Error(`User not found for email: ${email}`);
      }

      const passwordValid = await compare(password, user.password);
      if (!passwordValid) {
        throw new Error("Invalid password");
      }

      return {
        token: jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" }),
        user
      };
    },
    createDraft: (root, args, { user, prisma }) => {
      return prisma.createPost({
        description: args.description,
        author: {
          connect: { id: user.id }
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

const getUser = token => {
  try {
    if (token) {
      return jwt.verify(token, JWT_SECRET);
    }
    return null;
  } catch (err) {
    return null;
  }
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  context: ({ req }) => {
    const tokenWithBearer = req.headers.authorization || "";
    const token = tokenWithBearer.split(" ")[1];
    const user = getUser(token);

    return { user, prisma };
  }
});

module.exports = cors(apolloServer.createHandler());
