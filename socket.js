const socketIo = require('socket.io');
const userModel = require('./models/user.model');
const captainModel = require('./models/captain.model');

let io;

function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }


    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);


        socket.on('join', async (data) => {
            const { userId, userType } = data;

            if (userType === 'user') {
                await userModel.findByIdAndUpdate(userId, { socketId: socket.id });
            } else if (userType === 'captain') {
                await captainModel.findByIdAndUpdate(userId, { socketId: socket.id });
            }
        });


        socket.on('update-location-captain', async (data) => {
    try {
        const { userId, location } = data;

        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            return socket.emit('error', { message: 'Invalid location data' });
        }

        console.log(`Updating location for captain ${userId}:`, location);

        await captainModel.findByIdAndUpdate(userId, {
            location: {
                type: 'Point',
                coordinates: [location.lng, location.lat] // GeoJSON format
            }
        });

    } catch (err) {
        console.error('Error updating location:', err);
    }
});


        socket.on('cancel-ride', async ({ userId, captainId }) => {
            // Fetch both sockets
            const user = await userModel.findById(userId);  
            const captain = await captainModel.findById(captainId);

            if (user?.socketId) {
                io.to(user.socketId).emit('ride-cancelled');
            }

            if (captain?.socketId) {
                io.to(captain.socketId).emit('ride-cancelled');
            }
        });



        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });





}

const sendMessageToSocketId = (socketId, messageObject) => {

    console.log(messageObject);

    if (io) {
        io.to(socketId).emit(messageObject.event, messageObject.data);
    } else {
        console.log('Socket.io not initialized.');
    }
}

module.exports = { initializeSocket, sendMessageToSocketId };