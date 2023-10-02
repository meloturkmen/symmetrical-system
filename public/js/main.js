const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const inputMessage = document.getElementById('msg');
const TYPING_TIMER_LENGTH = 400; // ms

const videoGrid = document.getElementById('video-grid')
let myStream = null
const myVideo = document.createElement('audio')
myVideo.muted = true


const isDev = window.location.hostname === "localhost"
const SERVER_HOST = isDev ? "localhost" : "holonext-voice-chat-peer-server.onrender.com";

const PORT = isDev ? 9000 : 443;

const SOCKET_URL = isDev ? `http://${SERVER_HOST}:3000` : `https://holonext-voice-chat-23.onrender.com`;


const socket = io(SOCKET_URL, {});

const myPeer = new Peer(undefined, {
    path: "/peerjs",
    host: SERVER_HOST,
    port: PORT,
})

const peers = {}

let typing = false;
let lastTypingTime;

// Get username and room from URL
// ignoreQueryPrefix ignores the leading question mark. Can also use require('query-string')
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

// Insert into io('url') if different than window.location / domain


// Prevent duplicate username
socket.on('sameName', () => {
    alert("Username already exist, please choose another username.");
    window.history.back();
});

// Prevent entering invalid room
socket.on('roomNotValid', () => {
    alert("Room does not exist, please only select either Malaysia, Indonesia or Singapore.");
    window.history.back();
});

navigator.mediaDevices.getUserMedia({
    video: false,
    audio: true
}).then(stream => {
    myStream = stream
    addVideoStream(myVideo, stream)

    myPeer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('audio')
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
        })
    })

    socket.on('user-connected', userId => {
        // connectToNewUser(userId, stream)
        console.log(userId)
        // make sure myPeer.on('call') has been executed first
        setTimeout(connectToNewUser, 1000, userId, stream)
    })
})

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
})

myPeer.on('open', userPeerId => {
    // On join chatroom
    socket.emit('joinRoom', { userPeerId, username, room });
})

socket.on('mute', (data) => {
    console.log(data)
    const userBox = document.getElementById(data.username);

    const userMic = userBox.querySelector('.remote-mic');

    const userMicIcon = userMic.querySelector('i');

    userMicIcon.classList.remove('fa-microphone');
    userMicIcon.classList.add('fa-microphone-slash');
})

socket.on('unmute', (data) => {
    console.log(data)
    const userBox = document.getElementById(data.username);

    const userMic = userBox.querySelector('.remote-mic');

    const userMicIcon = userMic.querySelector('i');

    userMicIcon.classList.remove('fa-microphone-slash');
    userMicIcon.classList.add('fa-microphone');
});


function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('audio')
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream)
    })
    call.on('close', () => {
        video.remove()
    })

    peers[userId] = call
}

function addVideoStream(video, stream) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoGrid.append(video)
}

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    outputUsers(users);
});

inputMessage.addEventListener("input", () => {
    updateTyping();
});

// Updates the typing event
const updateTyping = () => {
    if (!typing) {
        typing = true;
        socket.emit('typing');
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
            socket.emit('stop typing');
            typing = false;
        }
    }, TYPING_TIMER_LENGTH);
}

socket.on('typing', (data) => {
    addChatTyping(data);
});

// Whenever the server emits 'stop typing', kill the typing message
socket.on('stop typing', (data) => {
    removeChatTyping(data);
});

// Adds the visual chat typing message
const addChatTyping = (data) => {
    data.typing = true;
    data.message = ' is typing..';
    addTypingMessage(data);
}

// Removes the visual chat typing message
const removeChatTyping = (data) => {
    const typingElement = document.getElementsByClassName('typing')

    while (typingElement.length > 0) typingElement[0].remove();
}

// Adds the visual chat message to the message list
const addTypingMessage = (data, options) => {
    const typingClass = data.typing ? 'typing' : '';
    const div = document.createElement('div');
    div.classList.add(typingClass);

    const p = document.createElement('p');
    p.innerText = data.username + data.message;

    div.appendChild(p);

    document.querySelector('.is-typing').appendChild(div);
}

// Message from server
socket.on('message', message => {
    console.log(message);
    outputMessage(message);

    // Scroll bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get message text
    const msg = e.target.elements.msg.value;

    // Emit message to server
    socket.emit('chatMessage', msg);
    socket.emit('stop typing');
    typing = false;

    // Clear input
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

// Output message to DOM
function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');

    const p = document.createElement('p');
    p.classList.add('meta');
    p.innerText = message.username + ' ';

    const spanTime = document.createElement('span');
    spanTime.innerText = message.time;
    p.appendChild(spanTime);

    div.appendChild(p);

    const para = document.createElement('p');
    para.classList.add('text');
    para.innerText = message.text;

    div.appendChild(para);

    document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
    roomName.innerText = room;
}



function toggleMic() {
    console.log('toggle mic');
    const userPeerId = myPeer.id;


    const userMic = document.querySelector('.user-mic');
    const userMicIcon = userMic.querySelector('i');



    if (userMicIcon.classList.contains('fa-microphone')) {
        console.log('muted');
        // disable audio on stream 
        myStream.getAudioTracks()[0].enabled = false;


        userMicIcon.classList.remove('fa-microphone');
        userMicIcon.classList.add('fa-microphone-slash');
        socket.emit('mute', userPeerId);
    }
    else {
        console.log('unmuted');
        //enable audio on stream
        myStream.getAudioTracks()[0].enabled = true;

        userMicIcon.classList.remove('fa-microphone-slash');
        userMicIcon.classList.add('fa-microphone');
        socket.emit('unmute', userPeerId);
    }
}


// Add users list to DOM
function outputUsers(users) {
    // Set the current user as the first order
    const currentUserIndex = users.findIndex(user => user.username === username);
    const rearrangedUsers = [...users];
    if (currentUserIndex !== -1) {
        const [currentUser] = rearrangedUsers.splice(currentUserIndex, 1);
        rearrangedUsers.unshift(currentUser);
    }

    userList.innerHTML = `
        ${rearrangedUsers.map(user =>
        `<li id="${user.username}" class="user-item ${user.username === username ? "user-box" : "remote-box"}">${user.username}
            <div class="audio-toggle-btn ${user.username === username ? "user-mic" : "remote-mic"}">
                <i class="fas fa-microphone"></i>
            </div>
        </li>`)
            .join('')}
    `;


    const userMic = document.querySelector('.user-mic');

    userMic.addEventListener('click', toggleMic);
}
