const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const { createServer } = require('http');
const app = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

let usuariosConectados = [];
let salas = ['General'];
let mensajesPorSala = {
  'General': [],
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

io.on('connection', (socket) => {
  socket.on("identificarse", (usuario) => {
    socket.usuario = usuario;
    usuariosConectados.push(usuario);
    io.emit('actualizarUsuarios', usuariosConectados);
    io.emit('mensaje', { 
      nombre: 'Servidor', 
      imagen: 'public/img/server_avatar.png', 
      mensaje: `${usuario.nombre} se ha unido al chat` 
    });
  });

  socket.on('unirseSala', (sala) => {
    socket.join(sala);
    socket.salaActual = sala;
    socket.emit('mensajesSala', mensajesPorSala[sala]);
    socket.emit('mensaje', { 
      nombre: 'Servidor', 
      imagen: 'public/img/server_avatar.png', 
      mensaje: `Te has unido a la sala ${sala}` 
    });
  });

  socket.on('mensaje', (datos) => {
    mensajesPorSala[socket.salaActual].push(datos);
    io.to(socket.salaActual).emit('mensaje', datos);
  });

  socket.on('archivo', (datos) => {
    mensajesPorSala[socket.salaActual].push(datos);
    io.to(socket.salaActual).emit('archivo', datos);
  });

  socket.on('escribiendo', (nombre) => {
    socket.broadcast.emit('escribiendo', nombre);
  });

  socket.on('escribiendoPrivado', (datos) => {
    socket.broadcast.emit('escribiendoPrivado', datos);
  });

  socket.on('mensajePrivado', (datos) => {
    const destinatarioSocket = Array.from(io.sockets.sockets.values()).find(s => s.usuario && s.usuario.nombre === datos.destinatario);
    if (destinatarioSocket) {
      destinatarioSocket.emit('mensajePrivado', datos);
    }
  });

  socket.on('disconnect', () => {
    if (socket.usuario) {
      usuariosConectados = usuariosConectados.filter(u => u.nombre !== socket.usuario.nombre);
      io.emit('actualizarUsuarios', usuariosConectados);
      io.emit('mensaje', { 
        nombre: 'Servidor', 
        imagen: 'public/img/server_avatar.png', 
        mensaje: `${socket.usuario.nombre} ha salido del chat` 
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Servidor en ejecución en el puerto ${port}`);
});