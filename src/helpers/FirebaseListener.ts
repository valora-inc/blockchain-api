import { DataSnapshot } from '@firebase/database-types'
import { database } from '../firebase'
import { logger } from '../logger'

const ON_VALUE_CHANGED = 'value'

export function listenFromFirebase<T>(
  path: string,
  callback: (value: T) => void,
): void {
  const onError = (error: Error) => {
    logger.error({
      type: 'ERROR_LISTENING_TO_FIREBASE',
      error: error.message,
    })
  }

  const onValue = (snapshot: DataSnapshot) => {
    const value = snapshot.val()
    callback(value)
  }

  database.ref(path).on(ON_VALUE_CHANGED, onValue, onError)
}
