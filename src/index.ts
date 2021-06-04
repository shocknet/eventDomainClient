import fetch from 'node-fetch'
import SocketsHandler from './sockets'
import { ProcessInput } from './types'
let relayAddress = 'http://localhost:3000'
let relayId:string|undefined
let relayToken: string|undefined
let localPort = 9835
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
if(process.argv[2] === 'standalone'){
    start()
}

export default async (message:ProcessInput,cb:(filled:ProcessInput)=>void) => {
    relayId = message.relayId
    relayToken = message.relayToken
    if(message.address){
        relayAddress = message.address
    }
    if(message.port){
        localPort = message.port
    }
    await start()
    cb({
        relayId,
        relayToken,
        address:relayAddress,
        port:localPort
    })
}