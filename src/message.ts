import { Context, Dict, Element, MessageEncoder } from 'koishi'
import { GeWeChatBot } from './bot'
import { Contact, Filebox, Message } from 'gewechaty'

export class GeWeChatMessageEncoder<C extends Context> extends MessageEncoder<C, GeWeChatBot<C, GeWeChatBot.Config>> {
  private payload: Dict = {}

  async flush(): Promise<void> {
    const msg = this.options.session.event._data as Message
    if (this.payload.text) {
      this.payload.text = this.payload.text.trimStart().trimEnd()

      const atters: Contact[] = []
      if (this.payload.at && this.payload.at.length > 0 && msg.isRoom) {
        for (const at of this.payload.at) {
          const atUser = await this.bot.internal.Contact.find({id: at });
          if (atUser) {
            atters.push(atUser)
          }
        }
      }


      if (this.payload.quote) {
        msg.quote(this.payload.text)
      } else {
        if (atters.length > 0) {
          const room = await msg.room()
          if (room) {
            room.say(this.payload.text, atters)
          }
        } else {
          msg.say(this.payload.text)
        }
      }
    }

    if(this.payload.img && this.payload.img.length > 0) {
      this.payload.img.forEach(async (img) => {
        msg.say(Filebox.fromFile(img))
      })
    }

    if(this.payload.file && this.payload.file.length > 0) {
      this.payload.file.forEach(async (file) => {
        msg.say(Filebox.fromFile(file))
      })
    }
  }
  async visit(element: Element): Promise<void> {
    const { type, attrs, children } = element

    if (type === 'template') await this.render(children)

    if (type === 'br') {
      if (!this.payload.text) this.payload.text = ''
      this.payload.text += '\n'
    }

    if (type === 'file') {
      if (!this.payload.file) this.payload.file = []
      this.payload.file.push(attrs.src)
    }

    if (type === 'quote') {
      this.payload.quote = attrs.id
    }

    if (type === 'at') {
      if (!this.payload.at) this.payload.at = []
      this.payload.at.push(attrs.id)
    }

    if (type === 'img' || type === 'image') {
      if (!this.payload.img) this.payload.img = []
      this.payload.img.push(attrs.src)
    }

    if (type === 'p') {
      if (!this.payload.text) this.payload.text = ''
      if (!this.payload.text.endsWith('\n')) this.payload.text += '\n'
      await this.render(children)
      if (!this.payload.text.endsWith('\n')) this.payload.text += '\n'
    }

    if (type === 'text') {
      if (!this.payload.text) this.payload.text = ''
      this.payload.text += attrs.content
    } else if (type === 'message') {
      await this.flush()
      await this.render(children)
      await this.flush()
    }
  }
}

