import io,{Socket} from 'socket.io-client'
//@ts-expect-error
import binaryParser from 'socket.io-msgpack-parser'
import fetch from 'node-fetch'
import { RelayParams,RelayMessageEvent, RelayMessage, RelayMessageNewSocket, RelayMessageHttpRequest, RelayMessageHttpResponse, RelayMessageHttpResponseOk,RelayMessageSocketAck, ExistingSockets } from './types';
const socketParams = {
    reconnection: true,
    rejectUnauthorized: false,
    parser: binaryParser,
    withCredentials: true,
    transports: ["websocket"],
    upgrade:false
}

export default class handler {
    constructor(clientPort:number,version:number,clientBaseAddress='http://localhost'){
        this.port = clientPort
        this.baseAddress= clientBaseAddress
        this.currentVersion = version
    }
    currentVersion:number
    port:number
    baseAddress:string
    relaySocket:Socket|null = null
    clientSockets:Record<string/*namespace*/,Record<string/*deviceId*/,Socket>> = {}
    openRelaySocket(params:RelayParams,cb:(connected:boolean)=>void) {
        this.relaySocket = io(`${params.relayAddress}/reservedHybridRelayNamespace`,socketParams)
        const timeouts:NodeJS.Timeout[] = []
        timeouts.push(this.waitAndCheck(3000,true,timeouts,cb))
        timeouts.push(this.waitAndCheck(1500,false,timeouts,cb))
        timeouts.push(this.waitAndCheck(1000,false,timeouts,cb))
        timeouts.push(this.waitAndCheck(500,false,timeouts,cb))
        this.relaySocket.on('connect',()=>{
            console.log("new socket connection event")
            if(!this.relaySocket){
                return
            }
            this.relaySocket.emit('hybridRelayToken', {
                token:params.relayToken,
                id:params.relayId,
                version:this.currentVersion
            },(existing:ExistingSockets[])=>{
                existing.forEach(oldSocket => {
                    this.openClientSocket(oldSocket)
                })
            })
            this.relaySocket.on('relay:internal:messageForward',(body:RelayMessageEvent)=>{
                if(!body || body.type !== 'socketEvent'){
                    this.emitOnRelaySocket('relay:internal:error',{type:'error',message:''})
                }
                const {namespace,eventName,eventBody,queryCallbackId,socketCallbackId,deviceId} = body
                if(!this.clientSockets[namespace]){
                    console.log("no namespace found for message!!")
                    return
                }
                if(!this.clientSockets[namespace][deviceId]){
                    console.log("no deviceId found for message!!")
                    return
                }
                this.clientSockets[namespace][deviceId].emit(eventName,eventBody,(error:any,response:any)=>{
                    const messageBody:RelayMessageSocketAck = {
                        type:'ack',
                        error,
                        response,
                        queryId:queryCallbackId,
                        socketId:socketCallbackId
                    }
                    this.emitOnRelaySocket('relay:internal:ackFromServer',messageBody)
                })
            })
            
            this.relaySocket.on('relay:internal:newSocket',(body:RelayMessageNewSocket)=>{
                if(!body || body.type !== 'socketNew'){
                    this.emitOnRelaySocket('relay:internal:error',{type:'error',message:''})
                }
                this.openClientSocket(body)
            })
            //TODO handle closed socket
            this.relaySocket.on('relay:internal:httpRequest',async (req:RelayMessageHttpRequest)=>{
                if(!req || req.type !== 'httpRequest'){
                    return
                }
                const {relayId,requestId,url,method,headers,body} = req
                try {
                    const params = {
                        method,
                        headers,
                        body:undefined
                    }
                    if(body && method !== 'GET' && method !== 'HEAD'){
                        params.body= typeof body === 'object' ? JSON.stringify(body) : body
                    }
                    const res = await fetch(`${this.baseAddress}:${this.port}${url}`,params)
                    const resBody = await res.text()
                    const response:RelayMessageHttpResponseOk={
                        type:'httpResponse',
                        result:'ok',
                        relayId,
                        requestId,
                        status:res.status,
                        headers:res.headers,
                        body:resBody
                    }
                    this.emitOnRelaySocket('relay:internal:httpResponse',response)
                } catch(e) {
                    console.error(e)
                    this.emitOnRelaySocket('relay:internal:httpResponse',{
                        type:'httpResponse',
                        result:'error',
                        message:'',
                        relayId,
                        requestId
                    })
                }
            })
            this.relaySocket.on('relay:internal:error',(err)=>{
                console.error(err)
            })
        })
        
        this.relaySocket.on('disconnect',reason => {
            console.log("relay socket disconnected:"+reason)//transport close
        })
    }

    openClientSocket(body:{namespace:string,deviceId:string}){
        const {namespace,deviceId} = body
        if(this.clientSockets[namespace] && this.clientSockets[namespace][deviceId]){
            this.clientSockets[namespace][deviceId].disconnect()
            delete this.clientSockets[namespace][deviceId]
        }
        console.log(`creating socket: ${this.baseAddress}:${this.port}${namespace}`)
        const socketParamsWithDevice = {
            ...socketParams,
            auth: {
                encryptionId: deviceId
            }
        }
        if(!this.clientSockets[namespace]){
            this.clientSockets[namespace] = {}
        }
        this.clientSockets[namespace][deviceId] = io(`${this.baseAddress}:${this.port}${namespace}`,socketParamsWithDevice)
        this.clientSockets[namespace][deviceId].onAny((eventName:string,eventBody)=>{
            const messageBody:RelayMessageEvent ={
                type:'socketEvent',
                eventBody,
                eventName,
                namespace,
                deviceId,
                queryCallbackId:'', //TODO callback to client
                socketCallbackId:'' //TODO callback to client
            }
            this.emitOnRelaySocket('relay:internal:messageBackward',messageBody)
        })
    }
    
    emitOnRelaySocket(eventName:string, eventBody:RelayMessage){
        if(!this.relaySocket || !this.relaySocket.connected){
            return
        }
        this.relaySocket.emit(eventName,eventBody)
    }
    waitAndCheck(time:number,final:boolean,timeouts:NodeJS.Timeout[],cb:(ok:boolean)=>void):NodeJS.Timeout {
        return setTimeout(()=>{
            if(this.relaySocket && this.relaySocket.connected){
                timeouts.forEach(timeout => {
                    clearTimeout(timeout)
                })
                cb(true)
                return
            }
            if(final){
                cb(false)
            }

        },time)
    }

}