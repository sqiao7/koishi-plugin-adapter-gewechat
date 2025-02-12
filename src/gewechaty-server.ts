import { Adapter, Context, h, Logger } from 'koishi'
import { GeWeChatBot } from './bot'
import { Contact, Friendship, Room, RoomInvitation } from 'gewechaty'
import { nodeCache } from './utils/cache'

export class GeWeChatyServer<C extends Context> extends Adapter<C, GeWeChatBot<C, GeWeChatBot.Config>> {
  constructor(ctx: C, bot: GeWeChatBot<C, GeWeChatBot.Config>) {
    super(ctx)

    this.handleSession(bot)
  }

  handleSession(bot: GeWeChatBot<C, GeWeChatBot.Config>) {
    bot.internal.on('friendship', async (friendship: Friendship) => {
      const session = bot.session()
      session.type = 'friend-request'
      session.event._data = friendship

      // @ts-ignore
      session.userId = friendship.formId
      // @ts-ignore
      session.channelId = friendship.formId
      session.content = friendship.hello()

      console.log(session)

      session.messageId = `friendship:${new Date().getTime()}`
      nodeCache.set<Friendship>(session.messageId, friendship, 60 * 5)

      bot.dispatch(session)
    })

    bot.internal.on('room-invite', async (roomInvitation: RoomInvitation) => {
      const session = bot.session()
      session.type = 'guild-request'
      session.event._data = roomInvitation

      session.messageId = `room-invite:${new Date().getTime()}`
      nodeCache.set<RoomInvitation>(session.messageId, roomInvitation, 60 * 5)

      bot.dispatch(session)
    })

    bot.internal.on('message', async (msg) => {
      const session = bot.session()

      session.messageId = msg._msgId
      session.timestamp = msg._createTime

      const msgFrom = await msg.from()
      session.userId = msg.fromId
      session.event.user = {
        id: msgFrom._wxid,
        nick: msgFrom._name,
        avatar: msgFrom._avatarUrl,
        name: msgFrom._alias
      }

      session.subtype = msg.isRoom ? 'group' : 'private'

      if (msg.isRoom) {
        const room = (await msg.room()) as Room

        session.channelId = room.chatroomId
        session.event.channel = {
          id: room.chatroomId,
          name: room.name,
          type: 0
        }

        session.event.guild = {
          id: room.chatroomId,
          name: room.name,
          avatar: room.avatarImg
        }
      } else {
        session.channelId = msgFrom._wxid
      }

      if (msg.type() === bot.internal.Message.Type.Text) {
        session.type = 'message'
        session.elements = [h.text(msg.text())]
      }

      if (msg.type() === bot.internal.Message.Type.Image) {
        session.type = 'image'
      }

      if (msg.type() === bot.internal.Message.Type.Voice) {
        session.type = 'audio'
      }

      if (msg.type() === bot.internal.Message.Type.Video) {
        session.type = 'video'
      }

      if (msg.type() === bot.internal.Message.Type.File) {
        session.type = 'file'
      }

      if (msg.type() === bot.internal.Message.Type.Location) {
        session.type = 'location'
      }

      if (msg.type() === bot.internal.Message.Type.RoomInvitation) {
        session.type = 'guild-request'
      }

      session.event._data = msg

      bot.dispatch(session)
    })
  }

  async connect(bot: GeWeChatBot<C, GeWeChatBot.Config>): Promise<void> {
    try {
      await bot.internal.start()
      const user = await bot.internal.info()
      bot.selfId = user.wxid
      bot.user = {
        id: user.wxid,
        name: user.name,
        nick: user.alias,
        isBot: true
      }
      bot.online()
    } catch (e) {
      bot.logger.error(`GeWeChatyServer connect error: ${e}`)
    }
  }

  async disconnect(bot: GeWeChatBot<C, GeWeChatBot.Config>): Promise<void> {
    bot.offline()
  }
}
