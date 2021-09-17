# Cypher Bot

A Discord bot for managing Valorant community 10man queues and more!

## Development

To develop locally, you will need

- A MongoDB instance (local or online)
- Yarn
- A Discord server to test in

### Dotenv

In your `.env` file, you need to set the following variables:

```
CYPHERBOT_CLIENT_ID=<client id from discord>
CYPHERBOT_TARGET_GUILD_ID=<server id for testing>
CYPHERBOT_TOKEN=<bot oauth token from discord>
DB_NAME=<database name for connection>
DB_CONN_STRING=mongodb+srv://<username>:<password>@<host>/<database>?retryWrites=true&w=majority
```

### Getting Started

You just need to install dependencies with

```
yarn install --prod false
```

and start the server with

```
yarn start
```
