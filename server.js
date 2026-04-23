/**
 * MeshTalk WebSocket Relay Server
 *
 * Routes P2P traffic between peers that can't connect directly (symmetric NAT).
 * Deploy FREE on Render.com: https://render.com/deploy
 *
 * Protocol:
 *   Client connects WebSocket → sends REGISTER with peerId
 *   Client A sends CONNECT {targetId: "B"} → relay notifies B with CONNECT_REQUEST
 *   B sends CONNECT_ACCEPT {targetId: "A"} → relay notifies A with CONNECTED
 *   After handshake: binary frames [64-byte peerId header][raw P2P bytes] are forwarded
 *
 * The relay is ZERO-KNOWLEDGE: it only sees encrypted bytes, never message content.
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const wss  = new WebSocket.Server({ port: PORT });

// peerId → WebSocket
const peers = new Map();

// Cleanup dead connections every 30s
setInterval(() => {
    for (const [id, ws] of peers) {
        if (ws.readyState !== WebSocket.OPEN) {
            peers.delete(id);
            console.log(`Cleaned up dead peer ${id.slice(0, 12)}`);
        }
    }
}, 30_000);

wss.on('connection', (ws) => {
    let myPeerId = null;

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            // Binary frame: [64 bytes target peerId (space-padded)][raw P2P packet]
            if (data.length < 64) return;
            const targetId = data.slice(0, 64).toString('utf8').trim();
            const payload  = data.slice(64);

            const targetWs = peers.get(targetId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                // Rewrite header: replace targetId with sender's peerId
                // so recipient knows who sent it
                const header = Buffer.alloc(64);
                Buffer.from(myPeerId || '', 'utf8').copy(header);
                const forwarded = Buffer.concat([header, payload]);
                targetWs.send(forwarded);
            }
            return;
        }

        // Text frame: JSON control message
        let msg;
        try { msg = JSON.parse(data); } catch { return; }

        switch (msg.type) {
            case 'REGISTER': {
                myPeerId = msg.peerId;
                if (!myPeerId) return;
                peers.set(myPeerId, ws);
                ws.send(JSON.stringify({ type: 'REGISTERED' }));
                console.log(`Peer registered: ${myPeerId.slice(0, 16)}`);
                break;
            }
            case 'CONNECT': {
                // A wants to connect to B via relay
                const targetId = msg.targetId;
                const targetWs = peers.get(targetId);
                if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'PEER_OFFLINE', peerId: targetId }));
                    return;
                }
                // Notify B that A wants to connect
                targetWs.send(JSON.stringify({
                    type:   'CONNECT_REQUEST',
                    fromId: myPeerId
                }));
                console.log(`Relay request: ${myPeerId?.slice(0,12)} → ${targetId.slice(0,12)}`);
                break;
            }
            case 'CONNECT_ACCEPT': {
                // B accepts A's connection request
                const targetId = msg.targetId;
                const targetWs = peers.get(targetId);
                if (!targetWs || targetWs.readyState !== WebSocket.OPEN) return;
                // Notify A that B accepted
                targetWs.send(JSON.stringify({
                    type: 'CONNECTED',
                    toId: myPeerId
                }));
                console.log(`Relay bridged: ${targetId.slice(0,12)} ↔ ${myPeerId?.slice(0,12)}`);
                break;
            }
        }
    });

    ws.on('close', () => {
        if (myPeerId) {
            peers.delete(myPeerId);
            console.log(`Peer disconnected: ${myPeerId.slice(0, 16)}`);
        }
    });

    ws.on('error', () => {});
});

console.log(`MeshTalk relay server running on port ${PORT}`);
