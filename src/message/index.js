'use strict'

const protobuf = require('protocol-buffers')
const fs = require('fs')
const Block = require('ipfs-block')
const path = require('path')

const pbm = protobuf(fs.readFileSync(path.join(__dirname, 'message.proto')))
const Entry = require('./entry')

class BitswapMessage {
  constructor (full) {
    this.full = full
    this.wantlist = new Map()
    this.blocks = new Map()
  }

  get empty () {
    return this.blocks.size === 0 && this.wantlist.size === 0
  }

  addEntry (key, priority, cancel) {
    const e = this.wantlist.get(key)

    if (e) {
      e.priority = priority
      e.cancel = Boolean(cancel)
    } else {
      this.wantlist.set(key, new Entry(key, priority, cancel))
    }
  }

  addBlock (block) {
    this.blocks.set(block.key, block)
  }

  cancel (key) {
    this.wantlist.delete(key)
    this.addEntry(key, 0, true)
  }

  toProto () {
    return pbm.Message.encode({
      wantlist: {
        entries: Array.from(this.wantlist.values()).map((e) => {
          return {
            block: String(e.key),
            priority: Number(e.priority),
            cancel: Boolean(e.cancel)
          }
        }),
        full: this.full
      },
      blocks: Array.from(this.blocks.values()).map((b) => b.data)
    })
  }

  equals (other) {
    console.log(this.wantlist.size !== other.wantlist.size)
    console.log(this.blocks.size !== other.blocks.size)
    console.log(this.full !== other.full)
    console.log(Array.from(this.wantlist.entries()), Array.from(other.wantlist.entries()))
    console.log(Array.from(this.blocks.entries()), Array.from(other.blocks.entries()))
    if (this.wantlist.size !== other.wantlist.size ||
        this.blocks.size !== other.blocks.size ||
        this.full !== other.full ||
        Array.from(this.wantlist.entries()) !== Array.from(other.wantlist.entries()) ||
        Array.from(this.blocks.entries()) !== Array.from(other.blocks.entries())
       ) {
      return false
    }

    return true
  }
}

BitswapMessage.fromProto = (raw) => {
  const dec = pbm.Message.decode(raw)
  const m = new BitswapMessage(dec.wantlist.full)

  dec.wantlist.entries.forEach((e) => {
    m.addEntry(e.block, e.priority, e.cancel)
  })
  dec.blocks.forEach((b) => m.addBlock(new Block(b)))

  return m
}

BitswapMessage.Entry = Entry
module.exports = BitswapMessage
