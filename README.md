# Blockchain API Service

## Setup

Install dependencies:

```
yarn
```

Copy the example .env file and check if there are any values you want to complete.
```
cp .env.example .env
```

You also need a service account for the Firebase connection. You can create one from the GCP IAM console following these steps (ignore all except the last one if you already have one):

- Open the GCP console.
- Go to `IAM & Admin`
- Choose `Service Accounts` from the side menu
- Pick a name such as `Development Service Account for FirstName LastName` and press `Continue`
- Assign the role `Firebase Admin`
- Press `Done`
- Search for the newly created service account in the list and press on its 'email' column to open it.
- Go to the `Keys` tab.
- `Add key` -> `Create new key` -> `JSON` -> `Create`
- You will be prompted to download the service account key. Rename it to `serviceAccountKey.json` and put it in the root of the repo.

## Running locally

### Docker Compose

Docker offers us a way to simply set up our local environment, so we can run the service with a implementation for every external dependency.
The `docker-compose.yml` contains all the configuration.
To run it, install docker from: https://docs.docker.com/desktop/mac/install/
Then, you should be able to run `docker-compose up` in the root of the repo and it will set up all the dependencies.

To see active docker containers, you can run `docker ps`

To enter in a container, you can run `docker exec -it ${CONTAINER_ID} /bin/bash`

#### Postgres

If you want to take a look at postgres db, access to the container with the command of above, and then `psql -U postgres`

### Build and start

```
yarn build
yarn start:dev  # Uses tsc-watch to watch the folder and rebuild as needed
```

## Deploying to App Engine

```
./deploy.sh -n {alfajores,mainnet}
```

