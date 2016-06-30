var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
	io = socketio.listen(server);
	io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		/*赋予用户一个访客名*/
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		/*把用户放入聊天室Lobby*/
		joinRoom(socket, 'Lobby');
		
		/*处理用户消息，更名，聊天室的创建和变更*/
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangedAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		/*提供已经被占用的聊天室列表*/
		socket.on('rooms', function () {
			socket.emit('rooms', io.sockets.manager.rooms);
		});

		/*用户断开连接后的清除逻辑*/
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
}; 

/*分配昵称*/
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Guest' + guestNumber;//新昵称 'Guest'+计数器
	nickNames[socket.id] = name;//昵称与客户端连接ID关联
	socket.emit('nameResult', {success: true, name: name});
	namesUsed.push(name);//存放已占用昵称
	return guestNumber + 1;//
}

/*进入聊天室*/
function joinRoom(socket, room) {
	socket.join(room);//进入房间
	currentRoom[socket.id] = room;//用户当前房间
	socket.emit('joinResult', {room: room});//通知用户进入新房间
	//通知其他用户
	socket.broadcast.to(room).emit('message', {text: nickNames[socket.id] + ' has joined '+ room + '.'});

	/*统计房间所有用户*/
	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomsSummary = 'Users currently in ' + room + ': ';
		for (var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomsSummary += ', ';
				};
				usersInRoomsSummary += nickNames[userSocketId];
			};
		}
		usersInRoomsSummary += '.';
		socket.emit('message', {text: usersInRoomsSummary});//将房间其他用户汇总发送给该用户
	};
}

/*变更昵称*/
function handleNameChangedAttempts (socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function (name) { // 注册改名监听
		if (name.indexOf('Guest') == 0) {//昵称不能以Guest开头
			socket.emit('nameResult', {success: false, message: 'Names cannot begin with "Guest".'});
		} else{
			if (namesUsed.indexOf(name) == -1) {//该昵称尚未注册
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];//删掉旧昵称
				socket.emit('nameResult', {success: true, name: name});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.',
				});
			} else {// 昵称已被占用
				socket.emit('nameResult', {
					success: false, message: 'That name is already in use.'
				});
			}
		};
	})
}

/*发送聊天消息*/
function handleMessageBroadcasting (socket, nickNames) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

/*加入房间*/
function handleRoomJoining (socket) {
	socket.on('join', function (room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection (socket, nickNames, namesUse) {
	socket.on('disconnect', function () {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}