
export type ProcessInput = {
    relayId?:string
    relayToken?:string
    port?:number
    address?:string
}


export type RelayParams = {
    relayId:string
    relayToken:string
    relayAddress:string
}
export type RelayMessageHttpRequest = {
    type:'httpRequest'
    relayId:string
    requestId:string
    method:string
    url:string
    headers:any
    body:any
}
export type RelayMessageHttpResponseOk = {
    type:'httpResponse'
    result:'ok'
    relayId:string
    requestId:string
    headers:any
    body:any
    status:number
}
export type RelayMessageHttpResponseFail = {
    type:'httpResponse'
    result:'error'
    relayId:string
    requestId:string
    message:string
}
export type RelayMessageHttpResponse = RelayMessageHttpResponseOk | RelayMessageHttpResponseFail

export type RelayMessageEvent = {
    type:'socketEvent'
    namespace:string
    eventName:string
    eventBody:string
    queryCallbackId:string
    socketCallbackId:string
}
export type RelayMessageNewSocket = {
    type:'socketNew'
    namespace:string
    deviceId:string
}
export type RelayMessageDisconnected = {
    type:'socketNew'
    namespace:string
}

export type RelayErrorMessage = {
    type:'error'
    message:string
}
export type RelayMessageSocketAck = {
    type:'ack'
    socketId:string
    queryId:string
    error:any
    response:any
}
export type RelayMessage = RelayMessageHttpRequest | RelayMessageHttpResponse | RelayMessageEvent | RelayMessageNewSocket | RelayMessageDisconnected | RelayErrorMessage | RelayMessageSocketAck