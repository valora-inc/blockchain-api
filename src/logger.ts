import * as Logger from 'bunyan'
import PrettyStream from 'bunyan-prettystream'
import { LoggingBunyan } from '@google-cloud/logging-bunyan'

const streams: Logger.Stream[] = []
if (process.env['GAE_APPLICATION']) {
  const loggingBunyan = new LoggingBunyan()
  streams.push(loggingBunyan.stream('info'))
} else {
  const consoleStream = new PrettyStream()
  consoleStream.pipe(process.stdout)
  streams.push({ stream: consoleStream, level: 'info' })
}

export const logger = Logger.createLogger({
  name: 'blockchain-api',
  streams,
  serializers: Logger.stdSerializers,
})
