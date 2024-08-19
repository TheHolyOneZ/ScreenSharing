const userList = document.getElementById('activeUsersList');
const screenView = document.getElementById('screenView');
const viewingUser = document.getElementById('viewingUser');
const sharedScreen = document.getElementById('sharedScreen');
const stopWatchingButton = document.getElementById('stopWatchingButton');

let peerConnection;
let ws;

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'get-active-users' }));
    };

    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        switch (message.type) {
            case 'active-users':
                updateUserList(message.users);
                break;
            case 'offer':
                await handleOffer(message);
                break;
            case 'ice-candidate':
                if (peerConnection) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                        console.log('Added ICE candidate successfully');
                    } catch (error) {
                        console.error('Error adding ICE candidate:', error);
                    }
                }
                break;
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };
}

function updateUserList(users) {
    console.log('Updating user list:', users);
    userList.innerHTML = '';
    if (users.length === 0) {
        userList.innerHTML = '<li>No active users</li>';
    } else {
        users.forEach(user => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = `Watch ${user}'s Screen`;
            button.onclick = () => watchScreen(user);
            li.appendChild(button);
            userList.appendChild(li);
        });
    }
}

async function handleOffer(message) {
    try {
        peerConnection = new RTCPeerConnection(servers);
        
        peerConnection.ontrack = event => {
            console.log('Received track:', event.track);
            sharedScreen.srcObject = event.streams[0];
            sharedScreen.style.display = 'block';
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    target: message.from
                }));
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        console.log('Set remote description successfully');

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('Created and set local description successfully');

        ws.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            target: message.from
        }));

        viewingUser.textContent = message.from;
        stopWatchingButton.style.display = 'inline-block';
    } catch (error) {
        console.error('Error in handleOffer:', error);
    }
}

function watchScreen(user) {
    console.log('Requesting to watch:', user);
    ws.send(JSON.stringify({
        type: 'watch-request',
        target: user
    }));
}

function stopWatching() {
    if (peerConnection) {
        peerConnection.close();
    }
    viewingUser.textContent = 'No one';
    stopWatchingButton.style.display = 'none';
    sharedScreen.style.display = 'none';
    sharedScreen.srcObject = null;
}

stopWatchingButton.addEventListener('click', stopWatching);

sharedScreen.addEventListener('loadedmetadata', () => {
    console.log('Video metadata loaded');
    sharedScreen.play().catch(error => console.error('Error playing video:', error));
});

connectWebSocket();

setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get-active-users' }));
    }
}, 5000);
async function handleOffer(message) {
    try {
        console.log('Received offer:', message);
        peerConnection = new RTCPeerConnection(servers);
        
        peerConnection.ontrack = event => {
            console.log('Received track:', event.track);
            sharedScreen.srcObject = event.streams[0];
            sharedScreen.style.display = 'block';
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate);
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    target: message.from
                }));
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        console.log('Set remote description successfully');

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('Created and set local description successfully');

        ws.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            target: message.from
        }));

        viewingUser.textContent = message.from;
        stopWatchingButton.style.display = 'inline-block';
    } catch (error) {
        console.error('Error in handleOffer:', error);
    }
}