# Blockchain API Service

## Setup

Install dependencies:

```
yarn
```

## Testing

Unit tests, linting, and formatting:

```
yarn test
```

End-to-end tests:

```
yarn e2e
```

## Running locally

You can run with the [Firebase emulator](#emulator) or a real
[Firebase account](#account). Copy the corresponding example config
file.

For the emulator:

```
# Check if there are any values you need to complete
cp emuluator.env .env
```

or for the account:

```
# Check if there are any values you need to complete
cp example.env .env
```

After completing your `.env`, build and start:

```
yarn start:dev  # Uses tsc-watch to watch the folder and rebuild as needed
```

## Firebase

### Emulator

Start the emulator before running blockchain-api:

```
yarn firebase:emulate
```

### Account

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

## Deploying to App Engine

```
./deploy.sh -n {alfajores,mainnet}
```
