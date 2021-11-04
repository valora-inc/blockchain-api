# Blockchain API Service

## Setup

Install dependencies:

```
yarn
```

Copy the example .env file and check if there are any values you want to complete. If you need to fill in any secrets they are located in GCP's `Secret Manager` under `blockchain-api`.
```
cp .env.example .env
```

You also need a service account for the Firebase connection. You can create one from the GCP IAM console following these steps (ignore all except the last one if you already have one):

- Open GCP's `celo-mobile-alfajores` project
- Go to IAM & Admin
- Choose `Service Accounts` from the side menu
- Pick a name such as `Development Service Account for FirstName LastName` and press `Continue`
- Assign the role `Firebase Admin`
- Press 'Done'
- Search for the newly created service account in the list and press on its 'email' column to open it.
- Go to the `Keys` tab.
- `Add key` -> `Create new key` -> `JSON` -> `Create`
- You will be prompted to download the service account key. Rename it to `serviceAccountKey.json` and put it in the root of the repo.

Ask in #engineering-team on Slack if you run into any issues.

## Running locally

Build and start:

```
yarn start:dev  # Uses tsc-watch to watch the folder and rebuild as needed
```

## Deploying to App Engine

```
./deploy.sh -n {alfajores,mainnet}
```
