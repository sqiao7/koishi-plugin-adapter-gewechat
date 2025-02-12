import { Bot, Context, Fragment, Quester, Schema } from 'koishi'
import { GeWeChatMessageEncoder } from './message'
import { Friendship, GeweBot, RoomInvitation } from 'gewechaty'
import { GeWeChatyServer } from './gewechaty-server'
import { Login, SendOptions } from '@satorijs/protocol'
import { nodeCache } from './utils/cache'

export class GeWeChatBot<C extends Context, T extends GeWeChatBot.Config> extends Bot<C, T> {
  static MessageEncoder: typeof GeWeChatMessageEncoder = GeWeChatMessageEncoder

  internal: GeweBot

  constructor(ctx: C, config: T) {
    super(ctx, config)
    this.platform = 'wechat'
    this.logger = ctx.logger('gewechat')

    this.internal = new GeweBot({
      debug: config.debug,
      port: config.callbackPort,
      route: config.callbackPath,
      base_api: config.baseApi,
      file_api: config.fileApi,
      static: config.staticPath
    })

    ctx.plugin(GeWeChatyServer, this)
  }

  async getLogin(): Promise<Login> {
      const user = await this.internal.info()
      this.user = {
        id: user.wxid,
        name: user.name,
        nick: user.alias,
      }
      this.selfId = user.wxid

      return this.toJSON();
  }

  async handleFriendRequest(messageId: string, approve: boolean, comment?: string): Promise<void> {
      const friendship = nodeCache.get<Friendship>(messageId)
      if(!friendship) {
        throw new Error("Friendship not found")
      }

      if (approve) {
        await friendship.accept()
      } else {
        // @ts-ignore
        await friendship.reject(comment)
      }
  }


  async handleGuildRequest(messageId: string, approve: boolean, comment?: string): Promise<void> {
      const roomInvitation = nodeCache.get<RoomInvitation>(messageId)
      if(!roomInvitation) {
        throw new Error("RoomInvitation not found")
      }

      if (approve) {
        await roomInvitation.accept()
      }
  }

  // async sendMessage(channelId: string, content: Fragment, referrer?: any, options?: SendOptions): Promise<string[]> {
  //   if(channelId.includes("chatroom")) {
  //     const room = await this.internal.Room.find({topic: channelId})
  //     if(!room) {
  //       throw new Error("Room not found")
  //     }

  //     return [room.chatroomId]
  //   } else {
  //     const contact = await this.internal.Contact.find({id: channelId})
  //     if(!contact) {
  //       throw new Error("Contact not found")
  //     }

  //     await contact.say(content)
  //     return [contact._wxid]
  //   }
  // }

  async sendPrivateMessage(userId: string, content: Fragment, guildId?: string, options?: SendOptions): Promise<string[]> {
      const contact = await this.internal.Contact.find({id: userId})
      if(!contact) {
        throw new Error("Contact not found")
      }

      await contact.say(content)
      return [contact._wxid]
  }

}

export namespace GeWeChatBot {
  interface BaseConfig {
    baseApi: string
    fileApi: string
    callbackPort: number
    callbackPath: string
    debug: boolean
    staticPath: string
  }

  export type Config = BaseConfig

  export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      baseApi: Schema.string().default("http://127.0.0.1:2531/v2/api").description('GEWECHAT 基础API地址'),
      fileApi: Schema.string().default("http://127.0.0.1:2532/download").description('GEWECHAT 文件API地址'),
      callbackPort: Schema.number().default(2533).description('GEWECHAT 回调端口'),
      callbackPath: Schema.string().default("/gewechat").description('GEWECHAT 回调路径'),
      staticPath: Schema.path().default("").description('GEWECHAT 静态资源路径'),
      debug: Schema.boolean().description('是否开启调试模式').default(true)
    })
  ])
}

