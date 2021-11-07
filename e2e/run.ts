const axios = require('axios')
import { spawn, ChildProcess } from 'child_process'

async function main() {
  process.on('SIGINT', () => process.exit(1))
  process.on('SIGTERM', () => process.exit(1))

  const env = {
    DEPLOY_ENV: 'e2e',
    FIREBASE_PROJECT_ID: 'e2e',
    EXCHANGE_RATES_API: 'https://apilayer.net/api',
    BLOCKSCOUT_API: 'https://alfajores-blockscout.celo-testnet.org/graphql',
    FIREBASE_DB: 'https://does.not.matter.com',
    FAUCET_ADDRESS: '0x456f41406B32c45D59E539e4BBA3D7898c3584dA',
    VERIFICATION_REWARDS_ADDRESS: '0xb4fdaf5f3cd313654aa357299ada901b1d2dd3b5',
    WEB3_PROVIDER_URL: 'https://alfajores-forno.celo-testnet.org',
    EXCHANGE_RATES_API_ACCESS_KEY: 'does.not.matter.com',
  }

  const subprocess: ChildProcess = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  })

  process.on('exit', () => {
    subprocess.kill()
  })

  // Ensure server starts.
  let now = Date.now()
  const end = now + 10 * 1000
  while (true) {
    try {
      const result = await axios({
        method: 'GET',
        url: '/.well-known/apollo/server-health',
        baseURL: 'http://localhost:8080',
      })
      if (result.status !== 200) {
        throw new Error(`Unexpected status: ${result.status}`)
      }
      break
    } catch (error) {
      now = Date.now()
      if (now > end) {
        throw error
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    }
  }

  // NOTE: if we add more tests we might need to set a valid
  // EXCHANGE_RATES_API_ACCESS_KEY above.
}

main()
  .then(() => {
    console.log('success') // eslint-disable-line no-console
    process.exit(0)
  })
  .catch((err) => {
    console.error(err) // eslint-disable-line no-console
    process.exit(1)
  })
