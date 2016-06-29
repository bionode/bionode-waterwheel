'use strict'

const stream = require('readable-stream')
const isStream = require('isstream')
const chalk = require('chalk')

const { tab } = require('./utils.js')

class Duplex extends stream.Duplex {
  constructor(opts) {
    super(opts)
  }

  _read(size) {
    console.log('reading')
  }

  _write(chunk, encoding, callback) {
    console.log('writing: ' + chunk.toString())

    this.push(chunk)
    callback()
  }
}

// Would use https://www.npmjs.com/package/stream-from-promise but may
// need to handle special resolve values (e.g. promise resolves to a stream) later
class ReadableFromPromise extends stream.Readable {
  constructor(promise, opts) {
    super(opts)

    this._promise = promise
  }

  _read(size) {
    this._promise
      .then((data) => {
        this.push(data)
        this.push(null)
      })
      .catch((err) => {
        this.emit('error', err)
        this.push(null)
      })
  }
}

class ReadableFromCallback extends stream.Readable {
  constructor(action, opts) {
    super(opts)

    this._action = action
  }

  _read(size) {
    this._action((err, data) => {
      if (err !== null) {
        this.emit('error', err)
        this.push(null)
      } else {
        this.push(data)
        this.push(null)
      }
    })
  }
}

/**
 * The Task class.
 * @param  {Object} props         object with input and output
 * @param  {function} actionCreator function to produce an actionCreator
 * @return {stream}               stream to be orchestrated
 */
const task = (props, actionCreator) => () => {
  // TODO check if actionCreator is a function


  // TODO handle unnamed task
  const { input, name } = props
  // TODO task lifecycle
  // 1. preparing
  console.log(`Running task ${chalk.blue(name)}`)
  // 2. resolving input
  // TODO
  // 1. resolve props OR
  // 2. use values passed in from last Task
  console.log(tab(1) + 'Resolving input')
  console.log(tab(2) + 'input: ' + input)
  // 3. creating
  // TODO use input/output, resolved promise, callback to determine stream type.
  // Or just always be duplex.
  let stream
  // const stream = new Readable()

  // Create the action
  // TODO handle actual callbacks, in which case we cant call this yet
  const action = actionCreator(props)

  // Get its type: can be stream, promise, function
  const actionType = (() => {
    if (action instanceof Promise) {
      return 'promise'
    } else if (typeof(action) === 'function') {
      // assume action returns function of signature fn(err, data)
      return 'curried-callback'
    } else if (isStream(action)) {
      return 'stream'
    } else {
      return 'unkown'
    }
  })()

  switch(actionType) {
    case 'promise':
      stream = new ReadableFromPromise(action)
      console.log(tab(1) + 'Creating a Readable from promise')
      break
    case 'curried-callback':
      stream = new ReadableFromCallback(action)
      break
    case 'stream':
      stream = action
      console.log(tab(1) + 'Creating a stream from stream')
      break
    default:
      console.log('Bad action type')
  }

  // 4. running
  // 5. resolving output
  // 6. ending, passing on output
  
  return stream
}

module.exports = task