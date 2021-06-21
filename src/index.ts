import fetch from 'node-fetch'
import SocketsHandler from './sockets'
import { ProcessInput, RelayParams } from './types'
let relayAddress = 'http://localhost:3000'
let relayId:string|undefined
let relayToken: string|undefined
let localPort = 9835
const CURRENT_ED_VERSION = 1
const CONNECTION_TIMEOUT = 15 * 1000
const socketsHandler = new SocketsHandler(localPort,CURRENT_ED_VERSION,CONNECTION_TIMEOUT)
const fetchNewToken = async  ():Promise<{token:string,relayId:string}> => {
    const res = await fetch(`${relayAddress}/reservedHybridRelayCreate`,{method:'POST'})
    return await res.json()
}



const start = async ():Promise<boolean> => {

    try {
        if(!relayId || !relayToken){
            const tokenInfo = await fetchNewToken()
            relayId = tokenInfo.relayId
            relayToken = tokenInfo.token
        }
        const params:RelayParams = {
            relayAddress,
            relayId,
            relayToken
        }
        return new Promise(res => {
            socketsHandler.openRelaySocket(params,connected => {
                res(connected)
            })
        })
    } catch(e){
        console.error(e)
        return false
    }
}
if(process.argv[2] === 'standalone'){
    start()
}

export default async (message:ProcessInput,cb:(connected:boolean,filled:ProcessInput)=>void) => {
    relayId = message.relayId
    relayToken = message.relayToken
    if(message.address){
        relayAddress = message.address
    }
    if(message.port){
        localPort = message.port
    }
    const connected = await start()
    cb(connected,{
        relayId,
        relayToken,
        address:relayAddress,
        port:localPort
    })
}