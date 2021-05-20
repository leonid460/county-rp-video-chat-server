import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server as SocketIoServer} from 'socket.io';
import mysql from 'mysql';
import dotEnv from 'dotenv';
import { DbQueriesContainer } from './dbQueries.js';
import { encoderFactory, validatorFactory } from './crypto.js';

dotEnv.config();

const PORT = process.env.PORT || 5000;
const usersMap = new Map();

const app = express();
const server = http.createServer(app);

const encoder = encoderFactory();
const validate = validatorFactory(encoder);

const mySqlConfig = {
	host: process.env.DB_URL,
	port: process.env.DB_PORT,
	user: process.env.DB_LOGIN,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	charset: 'UTF8',
};

const pool = mysql.createPool(mySqlConfig);;

const queriesContainer = new DbQueriesContainer(pool);

pool.on('error', (error) => {
	console.log(error);

	if (error.code === 'PROTOCOL_CONNECTION_LOST') {
		return pool.connect();
	}

	const timer = setInterval(() => {
		return pool.connect(() => {
			clearInterval(timer);
		});
	}, 5000)
})

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

app.post('/login', async (req, res) => {
	if (!req.body) {
		return res.status(400).send({
			message: 'Bad request'
		});
	}

	const { username, password } = req.body;

	try {
		const data = await queriesContainer.getUser(username);

		if (!data) {
			return res.status(404).send({
				message: 'Not found'
			});
		}

		if (!validate(password, data.password)) {
			return res.status(401).send({
				message: 'Invalid Password'
			});
		}

		return res.status(200).send({
			username: username,
		});
	} catch (err) {
		console.log(err);

		return res.status(500).send({
			message: 'Internal error'
		});
	}
});

app.post('/register', async (req, res) => {
	if (!req.body) {
		return res.status(400).send({
			message: 'Bad request'
		});
	}

	const { username, password } = req.body;

	try {
		const user = await queriesContainer.getUser(username);

		if (user) {
			return res.status(409).send({
				message: `User ${username} already exists`
			});
		}

		const hashedPassword = encoder(password);

		await queriesContainer.addUser(username, hashedPassword);

		return res.status(200).send({
			username: username,
		});
	} catch (error) {
		console.log(error);

		return res.status(500).send({
			message: 'Internal error'
		});
	}
})

io.on("connection", (socket) => {
	let username;

	socket.on('setUsername', (data) => {
		console.log(`${data.username} is connected`);
		username = data.username;

		usersMap.set(data.username, socket.id);

		console.log(usersMap);

		socket.emit('userConnect', { currentUsers: Array.from(usersMap.keys()) });
		socket.broadcast.emit('userConnect', { currentUsers: Array.from(usersMap.keys()) });
	})

	socket.on('disconnect', () => {
		console.log(`disconnect of ${username}`);

		usersMap.delete(username);
		console.log(usersMap);

		socket.broadcast.emit('userDisconnect', { currentUsers: Array.from(usersMap.keys()) });
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

