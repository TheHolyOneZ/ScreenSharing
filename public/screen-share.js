const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');
const startButton = document.getElementById('startButton');
const screenShareArea = document.getElementById('screenShareArea');
const userNameSpan = document.getElementById('userName');
const screenVideo = document.getElementById('screenVideo');
const stopButton = document.getElementById('stopButton');

let peerConnection;
let localStream;
let ws;
let userName;

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

nameInput.addEventListener('input', () => {
    startButton.disabled = nameInput.value.trim() === '';
});

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({ type: 'join', name: userName }));
    };

    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        switch (message.type) {
            case 'watch-request':
                await createOffer(message.from);
                break;
            case 'answer':
                await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
                console.log('Set remote description successfully');
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

async function createOffer(target) {
    try {
        peerConnection = new RTCPeerConnection(servers);
        localStream.getTracks().forEach(track => {
            console.log('Adding track to peer connection:', track);
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    target: target
                }));
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Created and set local description successfully');

        ws.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            target: target,
            from: userName
        }));
    } catch (error) {
        console.error('Error in createOffer:', error);
    }
}

async function startSharing(name) {
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({video: true});
        screenVideo.srcObject = localStream;
        userName = name;
        connectWebSocket();

        localStream.getVideoTracks()[0].addEventListener('ended', stopSharing);
    } catch (err) {
        console.error("Error: " + err);
        alert('Failed to start screen sharing. Please try again.');
    }
}

function stopSharing() {
    if (ws) {
        ws.send(JSON.stringify({ type: 'leave', name: userName }));
        ws.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    screenShareArea.style.display = 'none';
    nameForm.style.display = 'block';
    nameInput.value = '';
}

nameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name) {
        userNameSpan.textContent = name;
        nameForm.style.display = 'none';
        screenShareArea.style.display = 'block';
        await startSharing(name);
    }
});

stopButton.addEventListener('click', stopSharing);

window.addEventListener('beforeunload', stopSharing);

