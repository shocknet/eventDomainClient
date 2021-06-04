import io,{Socket} from 'socket.io-client'
//@ts-expect-error
import binaryParser from 'socket.io-msgpack-parser'
import fetch from 'node-fetch'
import { RelayParams,RelayMessageEvent, RelayMessage, RelayMessageNewSocket, RelayMessageHttpRequest, RelayMessageHttpResponse, RelayMessageHttpResponseOk,RelayMessageSocketAck } from './types';
const socketParams = {
    reconnection: true,
    rejectUnauthorized: false,
    parser: binaryParser,
    withCredentials: true,
    transports: ["websocket"]
}
export default class handler {
    constructor(clientPort:number,clientBaseAddress='http://localhost'){
        this.port = clientPort
        this.baseAddress= clientBaseAddress
    }
    port:number
    baseAddress:string
    relaySocket:Socket|null = null
    clientSockets:Record<string/*namespace*/,Socket> = {}
    openRelaySocket(params:RelayParams) {
        this.relaySocket = io(`${params.relayAddress}/reservedHybridRelayNamespace`,socketParams)
        console.log(this.relaySocket) 
        this.relaySocket.emit('hybridRelayToken', {
            token:params.relayToken,
            id:params.relayId
        },()=>{

        })
        this.relaySocket.on('relay:internal:messageForward',(body:RelayMessageEvent)=>{
            if(!body || body.type !== 'socketEvent'){
                this.emitOnRelaySocket('relay:internal:error',{type:'error',message:''})
            }
            const {namespace,eventName,eventBody,queryCallbackId,socketCallbackId} = body
            if(!this.clientSockets[namespace]){
                console.log("no namespace found for message!!")
                return
            }
            console.log(`sending to API: ${eventName} on ${namespace} from relay`)
            this.clientSockets[namespace].emit(eventName,eventBody,(error:any,response:any)=>{
                const messageBody:RelayMessageSocketAck = {
                    type:'ack',
                    error,
                    response,
                    queryId:queryCallbackId,
                    socketId:socketCallbackId
                }
                console.log("got server Ack!")
                console.log(messageBody)
                this.emitOnRelaySocket('relay:internal:ackFromServer',messageBody)
            })
        })
        
        this.relaySocket.on('relay:internal:newSocket',(body:RelayMessageNewSocket)=>{
            if(!body || body.type !== 'socketNew'){
                this.emitOnRelaySocket('relay:internal:error',{type:'error',message:''})
            }
            const {namespace} = body
            if(this.clientSockets[namespace]){
                this.clientSockets[namespace].disconnect()
                delete this.clientSockets[namespace]
            }
            console.log(`creating socket: ${this.baseAddress}:${this.port}${namespace}`)
                const socketParamsWithDevice = {
                    ...socketParams,
                    auth: {
                        encryptionId: body.deviceId
                    }
                }
                this.clientSockets[namespace] = io(`${this.baseAddress}:${this.port}${namespace}`,socketParamsWithDevice)
                this.clientSockets[namespace].onAny((eventName:string,eventBody)=>{
                    const messageBody:RelayMessageEvent ={
                        type:'socketEvent',
                        eventBody,
                        eventName,
                        namespace,
                        queryCallbackId:'', //TODO callback to client
                        socketCallbackId:'' //TODO callback to client
                    }
                    console.log(`got ${eventName} on ${namespace} from API relaying...`)
                    this.emitOnRelaySocket('relay:internal:messageBackward',messageBody)
                })
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
                console.log(`fetching -> ${this.baseAddress}:${this.port}${url}`)
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
        this.relaySocket.on('disconnect',reason => {
            console.log(reason)
        })
    }
    
    emitOnRelaySocket(eventName:string, eventBody:RelayMessage){
        if(!this.relaySocket || !this.relaySocket.connected){
            return
        }
        this.relaySocket.emit(eventName,eventBody)
    }
}