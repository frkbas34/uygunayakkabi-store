'use strict'

const blocked = () => {
  throw new Error('CONTROLLED_FRESH_CANDIDATE_OFFLINE_TRANSPORT_BLOCKED')
}

globalThis.fetch = blocked

const http = require('node:http')
const https = require('node:https')
const http2 = require('node:http2')
const net = require('node:net')
const tls = require('node:tls')
const dns = require('node:dns')
const dgram = require('node:dgram')
const fs = require('node:fs')
const path = require('node:path')

const originalNetConnect = net.connect
const originalNetCreateConnection = net.createConnection
const originalSocketConnect = net.Socket.prototype.connect
const isTsxIpc = (target) => {
  const normalized = Array.isArray(target) ? target[0] : target
  const candidate = typeof normalized === 'string'
    ? normalized
    : normalized && typeof normalized === 'object' && typeof normalized.path === 'string'
      ? normalized.path
      : ''
  return candidate.endsWith('.pipe') && /(?:^|[/\\])tsx-[a-z0-9._-]+(?:[/\\]|$)/iu.test(candidate)
}
const allowTsxIpcOrBlock = (original, receiver, args) => {
  if (!isTsxIpc(args[0])) return blocked()
  return Reflect.apply(original, receiver, args)
}
const protectedEnvironmentFile = (value) => {
  const candidate = value instanceof URL ? value.pathname : value
  if (typeof candidate !== 'string' && !Buffer.isBuffer(candidate)) return false
  const basename = path.basename(String(candidate))
  return /^\.env(?:\..+)?$/u.test(basename) && basename !== '.env.example'
}
const environmentFileAbsent = () => {
  const error = new Error('CONTROLLED_FRESH_CANDIDATE_PROTECTED_ENV_FILE_DISABLED')
  error.code = 'ENOENT'
  throw error
}
const originalReadFileSync = fs.readFileSync
const originalReadFile = fs.readFile
const originalPromisesReadFile = fs.promises.readFile
fs.readFileSync = function (file, ...args) {
  if (protectedEnvironmentFile(file)) return environmentFileAbsent()
  return Reflect.apply(originalReadFileSync, fs, [file, ...args])
}
fs.readFile = function (file, ...args) {
  if (protectedEnvironmentFile(file)) return environmentFileAbsent()
  return Reflect.apply(originalReadFile, fs, [file, ...args])
}
fs.promises.readFile = function (file, ...args) {
  if (protectedEnvironmentFile(file)) return Promise.reject(Object.assign(
    new Error('CONTROLLED_FRESH_CANDIDATE_PROTECTED_ENV_FILE_DISABLED'),
    { code: 'ENOENT' },
  ))
  return Reflect.apply(originalPromisesReadFile, fs.promises, [file, ...args])
}
if (typeof process.loadEnvFile === 'function') process.loadEnvFile = environmentFileAbsent

http.request = blocked
http.get = blocked
https.request = blocked
https.get = blocked
http2.connect = blocked
net.connect = function (...args) { return allowTsxIpcOrBlock(originalNetConnect, net, args) }
net.createConnection = function (...args) { return allowTsxIpcOrBlock(originalNetCreateConnection, net, args) }
net.Socket.prototype.connect = function (...args) { return allowTsxIpcOrBlock(originalSocketConnect, this, args) }
tls.connect = blocked
dns.lookup = blocked
dns.resolve = blocked
dns.resolve4 = blocked
dns.resolve6 = blocked
dns.resolveAny = blocked
dns.reverse = blocked
dns.promises.lookup = blocked
dns.promises.resolve = blocked
dns.promises.resolve4 = blocked
dns.promises.resolve6 = blocked
dns.promises.resolveAny = blocked
dns.promises.reverse = blocked
dgram.createSocket = blocked

require('node:module').syncBuiltinESMExports()
