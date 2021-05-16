const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

app.use(cors());

const PORT = process.env.PORT || 5000;

const usersMap = new Map();

app.get('/', (req, res) => {
	res.send('Running');
});

io.on("connection", (socket) => {
	socket.on('setUsername', (data) => {
		console.log(`${data.username} is connected`);

		usersMap.set(data.username, socket.id);

		console.log(usersMap)
	})

	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded")
	});

	socket.on("callUser", ({ userToCall, signalData, callerUsername }) => {
		const userToCallSocketId = usersMap.get(userToCall);

		console.log(`Call from ${callerUsername} to ${userToCall}`);

		io.to(userToCallSocketId).emit("callUser", { signal: signalData, callerUsername });
	});

	socket.on("answerCall", (data) => {
		console.log(`answer call from ${data.to}`);
		const socketId = usersMap.get(data.to);

		io.to(socketId).emit("callAccepted", data.signal)
	});
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

