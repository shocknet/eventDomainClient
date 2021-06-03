import fetch from 'node-fetch'
import SocketsHandler from './sockets'
const relayAddress = 'http://localhost:3000'
let relayId = 'd42100d0-c3e2-11eb-ba56-213c4e241c1b'
let relayToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InRpbWVzdGFtcCI6MTYyMjY2NjQ1NTM4OSwicmVsYXlJZCI6ImQ0MjEwMGQwLWMzZTItMTFlYi1iYTU2LTIxM2M0ZTI0MWMxYiJ9LCJpYXQiOjE2MjI2NjY0NTUsImV4cCI6NTIyMjY2NjQ1NX0.Vopoa1BvYeAeIgA-DWQpaHEH-avZrSBbsZYm-e8Y0rk'
const localPort = 9835
const socketsHandler = new SocketsHandler(localPort)
const fetchNewToken = async  ():Promise<{token:string,relayId:string}> => {
    const res = await fetch(`${relayAddress}/reservedHybridRelayCreate`,{method:'POST'})
    return await res.json()
}

const start = async () => {

    try {
        if(!relayId || !relayToken){
            const tokenInfo = await fetchNewToken()
            relayId = tokenInfo.relayId
            relayToken = tokenInfo.token
        }
        console.log({relayId,relayToken})

        socketsHandler.openRelaySocket({
            relayAddress,
            relayId,
            relayToken
        })
    } catch(e){
        console.error(e)
    }
}

start()

/*





socket = io("http://localhost:3000/aaa",{
    reconnection: true,
    rejectUnauthorized: false,
    parser: binaryParser,
    withCredentials: true,
    transports: ["websocket"]
})
console.log("ei")
socket.on("connect",()=>{
    console.log("er")
    socket.emit("hybridRelayId",{id:"brooh"})
    socket.emit("swaggd",{id:"brooh"})
    socket.emit("fdsf",{id:"brooh"})
})*/