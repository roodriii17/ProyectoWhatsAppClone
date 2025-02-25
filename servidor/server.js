const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const { createServer } = require('http');
const app = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

let usuariosConectados = [];

// Servir archivos estáticos desde la carpeta 'public'
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
      nombre: usuario.nombre, 
      imagen: usuario.imagen, 
      mensaje: `${usuario.nombre} se ha unido al chat` 
    });
  });

  socket.on('unirseSala', (sala) => {
    socket.join(sala);
    socket.salaActual = sala;
    socket.emit('mensaje', { nombre: 'Servidor', mensaje: `Te has unido a la sala ${sala}` });
  });

  socket.on('mensaje', (datos) => {
    io.to(socket.salaActual).emit('mensaje', datos);
  });

  socket.on('escribiendo', (usuario) => {
    socket.broadcast.to(socket.salaActual).emit('escribiendo', usuario);
  });

  socket.on('mensajePrivado', (datos) => {
    const destinatario = usuariosConectados.find(u => u.nombre === datos.destinatario);
    if (destinatario) {
      const socketDestinatario = Array.from(io.sockets.sockets.values()).find(s => s.usuario.nombre === datos.destinatario);
      if (socketDestinatario) {
        const salaPrivada = `privado-${socket.usuario.nombre}-${datos.destinatario}`;
        socket.join(salaPrivada);
        socketDestinatario.join(salaPrivada);
        io.to(salaPrivada).emit('mensajePrivado', { 
          nombre: socket.usuario.nombre, 
          imagen: socket.usuario.imagen, 
          mensaje: datos.mensaje 
        });
      }
    }
  });

  socket.on('escribiendoPrivado', (datos) => {
    const destinatario = usuariosConectados.find(u => u.nombre === datos.destinatario);
    if (destinatario) {
      const socketDestinatario = Array.from(io.sockets.sockets.values()).find(s => s.usuario.nombre === datos.destinatario);
      if (socketDestinatario) {
        const salaPrivada = `privado-${socket.usuario.nombre}-${datos.destinatario}`;
        socketDestinatario.emit('escribiendoPrivado', { nombre: socket.usuario.nombre, sala: salaPrivada });
      }
    }
  });

  socket.on('archivo', (datos) => {
    io.to(socket.salaActual).emit('archivo', datos);
  });

  socket.on('disconnect', () => {
    if (socket.usuario) {
      usuariosConectados = usuariosConectados.filter(u => u.nombre !== socket.usuario.nombre);
      io.emit('actualizarUsuarios', usuariosConectados);
      io.emit('mensaje', { 
        nombre: socket.usuario.nombre, 
        mensaje: `${socket.usuario.nombre} ha salido del chat` 
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Servidor en ejecución en el puerto ${port}`);
});