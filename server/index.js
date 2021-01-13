const express = require('express')
const http = require('http')
const { use } = require('./router')

const PORT = process.env.PORT || 5000
const router = require('./router')

const {addUser, removeUser, getUser, getUsersInRoom} = require('./users')

const app = express()
const server = http.createServer(app)
const io = require("socket.io")(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

io.on('connection', (socket)=>{
    socket.on('join', ({name,room}, callBack)=>{
      const {error, user} = addUser({id: socket.id, name,room});

      if(error)return callBack(error)
      
      //message is the message sent by the admin
      socket.emit('message', {user:'admin', text: `${user.name}, welcome to the room ${user.room}`})
      socket.broadcast.to(user.name).emit('message', {user:'admin', text: `${user.name}, has joined!`})
      
      
      socket.join(user.room);
      
      io.to(user.room).emit('roomData', {room:user.room, users:getUsersInRoom(user.room)})

      callBack()
    })

    //sendMessage is the messages sent by user
    socket.on('sendMessage', (message, callback)=>{
      //get user who sent the message
      const user = getUser(socket.id)

      io.to(user.room).emit('message', {user:user.name, text:message})
      io.to(user.room).emit('roomData', {room:user.room, text:message})

      callback();
    })

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)
        if(user){
          io.to(user.room).emit('message', {user:"admin", text:`${user.name} has left !`})
        }
    })
})


app.use(router)

server.listen(PORT, ()=>console.log(`server has started on port: ${PORT}`))