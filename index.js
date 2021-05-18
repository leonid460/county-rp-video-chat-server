import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server as SocketIoServer} from 'socket.io';
import mysql from 'mysql';
import dotEnv from 'dotenv';

dotEnv.config();

const PORT = process.env.PORT || 5000;
const usersMap = new Map();
const usersMapForAuth = new Map();

const app = express();
const server = http.createServer(app);

const mySqlConfig = {
	host: process.env.DB_URL,
	port: process.env.DB_PORT,
	user: process.env.DB_LOGIN,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	charset: 'UTF8',
};

console.log(mySqlConfig);

const connection = mysql.createConnection(mySqlConfig);
connection.connect();

const io = new SocketIoServer(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
	res.send('Running');
});

app.post('/login', (req, res) => {
	if (!req.body) {
		return res.status(400).send({
			message: 'Bad request'
		});
	}

	const { username, password } = req.body;

	if (!usersMapForAuth.has(username)) {
		return res.status(404).send({
			message: 'Not found'
		});
	}

	if (usersMapForAuth.get(username) !== password) {
		return res.status(401).send({
			message: 'Invalid Password'
		});
	}

	return res.status(200).send({
		username: username,
	});
});

app.post('/register', (req, res) => {
	console.log('REGISTRATION');
	const { username, password } = req.body;

	if (usersMapForAuth.has(username)) {
		return res.status(409).send({
			message: `User ${username} already exists`
		});
	}

	usersMapForAuth.set(username, password);

	console.log(usersMapForAuth);

	res.status(200).send({
		username: username,
	});
})

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

