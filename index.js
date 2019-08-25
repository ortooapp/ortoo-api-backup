const cors = require("micro-cors")();
const { ApolloServer, gql } = require("apollo-server-micro");

const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: (root, args, context) => {
      return "Hello from Ortoo";
    }
  }
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true
});

module.exports = cors(apolloServer.createHandler());
