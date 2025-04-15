import { Socket } from "socket.io";

export const handleSocket = (socket: Socket) => {
    console.log(`✅ Socket ID: ${socket.id} is connected`);
    socket
        .on('disconnect', (data: unknown) => {
            console.log(`❌ Socket ID: ${socket.id} has disconnected`);
        })
}