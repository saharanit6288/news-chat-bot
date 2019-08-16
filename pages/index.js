import React from 'react'
import axios from 'axios'
import { ChatFeed, Message } from 'react-chat-ui'
import Pusher from 'pusher-js'
import MyChatBubble from '../components/MyChatBubble'
import '../css/chat.css'

const pusher = new Pusher(process.env.PUSHER_KEY, {
  cluster: process.env.PUSHER_CLUSTER,
  encrypted: true
})

const channel = pusher.subscribe('news')

export default class Index extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      message: '',
      isTyping: false,
      messages: [
        new Message({
          id: 'bot',
          message: 'hello',
          senderName: 'bot'
        }),
        new Message({
          id: 2,
          message: 'hi bobby'
        })
      ]}
  }

  componentDidMount () {
    this.receiveUpdateFromPusher()
  }

  /**
  * When there's an update,
  * append the message to the Chat field.
  */
  receiveUpdateFromPusher () {
    channel.bind('news-update', articles => {
      const messages = articles.map(article => {
        return new Message({
          id: 'bot',
          message: `
            Description: ${article.title || article.description}
            Url: ${article.url}
          `
        })
      })
      const intro = messages.length ? 'Here you go, i found some for you' : 'I couldn\'t find any :-(. Search for something else'
      this.setState({
        messages: [
          ...this.state.messages,
          new Message({
            id: 'bot',
            message: intro
          }),
          ...messages
        ]
      })
    })
  }

  handleChange (event) {
    this.setState({message: event.target.value})
  }

  /**
  * When user press Enter, send message to the server
  */
  handleKeyPress (e) {
    if (e.key === 'Enter' && e.target.value) {
      const message = e.target.value
      this.setState({message: ''})
      this.pushMessage(message)

      axios.post('http://localhost:5000/message', {message})
      .then(res => {
        console.log('received by server')
      })
      .catch(error => {
        console.error('ERROR:', error)
      })
    }
  }

  pushMessage (message) {
    this.setState({
      messages: [
        ...this.state.messages,
        new Message({
          id: 2,
          message
        })
      ]
    })
  }

  render () {
    return (
      <div className='chat-wrapper'>
        <h3> Channel 24: News worldwide with Bobby Mc-newsfeed</h3>
        <ChatFeed
          messages={this.state.messages} // Boolean: list of message objects
          isTyping={this.state.isTyping} // Boolean: is the recipient typing
          hasInputField={false} // Boolean: use our input, or use your own
          showSenderName // show the name of the user who sent the message
          bubblesCentered={false} // Boolean should the bubbles be centered in the feed?
          chatBubble={MyChatBubble}
          maxHeight={750}
        />
        <input className='chat-input' type='text' value={this.state.message}
          onChange={this.handleChange.bind(this)}
          onKeyPress={this.handleKeyPress.bind(this)}
          placeholder='Type a message...' />
      </div>
    )
  }
}