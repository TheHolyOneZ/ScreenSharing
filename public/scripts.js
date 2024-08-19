const socket = io();
let localStream;
let peerConnections = {};
const usernameInput = document.getElementById('username');
const joinButton = document.getElementById('joinButton');
const startSharingButton = document.getElementById('startSharingButton');
const userList = document.getElementById('userList');
const remoteVideos = document.getElementById('remoteVideos');
const messages = document.getElementById('messages');
const chatMessageInput = document.getElementById('chatMessage');
const sendMessageButton = document.getElementById('sendMessage');

joinButton.onclick = () => {
    const username = usernameInput.value;
    if (username) {
        socket.emit('join', username);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
    }
};

startSharingButton.onclick = async () => {
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    for (let id in peerConnections) {
        localStream.getTracks().forEach(track => peerConnections[id].addTrack(track, localStream));
        const offer = await peerConnections[id].createOffer();
        await peerConnections[id].setLocalDescription(offer);
        socket.emit('offer', { target: id, sdp: peerConnections[id].localDescription, username: usernameInput.value });
    }
};

socket.on('update-user-list', (users) => {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        li.onclick = () => {
            if (!peerConnections[user]) {
                const peerConnection = new RTCPeerConnection();
                peerConnections[user] = peerConnection;

                peerConnection.onicecandidate = event => {
                    if (event.candidate) {
                        socket.emit('candidate', { target: user, candidate: event.candidate, username: usernameInput.value });
                    }
                };

                peerConnection.ontrack = event => {
                    const remoteVideo = document.createElement('video');
                    remoteVideo.srcObject = event.streams[0];
                    remoteVideo.autoplay = true;
                    remoteVideos.appendChild(remoteVideo);
                };

                peerConnection.onnegotiationneeded = async () => {
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    socket.emit('offer', { target: user, sdp: peerConnection.localDescription, username: usernameInput.value });
                };
            }
        };
        userList.appendChild(li);
    });
});

socket.on('offer', async (data) => {
    if (!peerConnections[data.username]) {
        const peerConnection = new RTCPeerConnection();
        peerConnections[data.username] = peerConnection;

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', { target: data.username, candidate: event.candidate, username: usernameInput.value });
            }
        };

        peerConnection.ontrack = event => {
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.autoplay = true;
            remoteVideos.appendChild(remoteVideo);
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { target: data.username, sdp: peerConnection.localDescription, username: usernameInput.value });
    }
});

socket.on('answer', async (data) => {
    await peerConnections[data.username].setRemoteDescription(new RTCSessionDescription(data.sdp));
});

socket.on('candidate', async (data) => {
    await peerConnections[data.username].addIceCandidate(new RTCIceCandidate(data.candidate));
});

socket.on('message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = `${data.username}: ${data.message}`;
    messages.appendChild(messageDiv);
});

sendMessageButton.onclick = () => {
    const message = chatMessageInput.value;
    if (message) {
        socket.emit('message', { username: usernameInput.value, message });
        chatMessageInput.value = '';
    }
};

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err);
});
