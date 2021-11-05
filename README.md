# Blockchain API Service

## Setup

Install dependencies:

```
yarn
```

## Docker Compose

Docker offers us a way to simply set up our local environment, so we can run the service with a implementation for every external dependency.
The `docker-compose.yml` contains all the configuration.
To run it, install docker from: https://docs.docker.com/desktop/mac/install/
Then, you should be able to run `docker-compose up` in the root of the repo and it will set up all the dependencies.

To see active docker containers, you can run `docker ps`

To enter in a container, you can run `docker exec -it ${CONTAINER_ID} /bin/bash`

### Postgres

If you want to take a look at postgres db, access to the container with the command of above, and then `psql -U postgres`

## Running locally

Build and start:

```
yarn start:dev  # Uses tsc-watch to watch the folder and rebuild as needed
```

## Deploying to App Engine

```
./deploy.sh -n {alfajores,mainnet}
```

