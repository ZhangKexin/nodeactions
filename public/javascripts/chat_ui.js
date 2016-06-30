
/*显示可疑文本*/
function divEscapedContentElement (message) {
	return $('<div></div>').text(message);
}

/*显示系统创建的受信文本*/
function divSystemContentElement (message) {
	return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput (chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;

	if (message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		if (systemMessage) {
			$('#messages').append(divSystemContentElement(systemMessage));
		};
	} else{
		chatApp.sendMessage($('#room').text(), message);
		$('#messages').append(divEscapedContentElement(message));
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	};
	$('#send-message').val('');
}

var socket = io.connect();
$(document).ready(function () {
	var chatApp = new Chat(socket);
	/*更改昵称*/
	socket.on('nameResult', function (result) {
		var message;
		if (result.success) {
			message = 'You are now known as ' + resule.name + '.';
		} else{
			message = result.message;
		};
		$('#messages').append(divSystemContentElement(message));
	});
	/*房间变更结果*/
	socket.on('joinResult', function (result) {
		$('#room').text(result.room);
		$('#messages').append(divSystemContentElement('Room changed.'));
	});
	/*收到消息*/
	socket.on('message', function (message) {
		var newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});
	/*可用房间列表*/
	socket.on('rooms', function (rooms) {
		$('#room-list').empty();
		for(var room in rooms){
			room = room.substring(1, room.length);
			if (room != '') {
				$('#room-list').append(divEscapedContentElement(room));
			};
		}
		$('#room-list div').click(function () { // 切换房间
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});
	});

	/*定期请求可用房间列表*/
	setInterval(function () {
		socket.emit('rooms');
	}, 1000);

	/*发送消息*/
	$('#send-message').focus();
	$('#send-form').submit(function () {
		processUserInput(chatApp, socket);
		return false;
	});
});