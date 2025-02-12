import { GeWeChatBot } from './bot'

export const name = 'adapter-gewechat'

export * from './bot'
export * from './message'
export * from './gewechaty-server'

export default GeWeChatBot

declare module 'koishi' {
  interface Context {
    server: any
  }
}




