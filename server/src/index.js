const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const  { v4 : uuidv4 } = require('uuid');
 

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    socket.userId = uuidv4();
    const { error, user } = addUser({ id: socket.userId, name, room });

    if(error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'Admin', text: `${user.name}, welcome to room ${user.room}.`});
    socket.broadcast.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.userId);

    io.to(user.room).emit('message', { user: user.name, text: message });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.userId);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

const PORT = process.env.PORT || 5000

server.listen(PORT, () => console.log(`Server has started in ${PORT}`));