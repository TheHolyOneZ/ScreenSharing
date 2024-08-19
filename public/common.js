const socket = io();

const config = {
    iceServers: [
        { 
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

function handleError(error) {
    console.error('Error:', error);
}
