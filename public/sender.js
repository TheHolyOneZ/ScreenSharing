let peerConnection;

document.getElementById('startShare').addEventListener('click', startScreenShare);

async function startScreenShare() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({video: true});
        document.getElementById('localVideo').srcObject = stream;
        
        peerConnection = new RTCPeerConnection(config);
        
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
        
    } catch (error) {
        handleError(error);
    }
}

socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        handleError(error);
    }
});

socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        handleError(error);
    }
});
