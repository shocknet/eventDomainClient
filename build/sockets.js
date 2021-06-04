"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var socket_io_client_1 = __importDefault(require("socket.io-client"));
//@ts-expect-error
var socket_io_msgpack_parser_1 = __importDefault(require("socket.io-msgpack-parser"));
var node_fetch_1 = __importDefault(require("node-fetch"));
var socketParams = {
    reconnection: true,
    rejectUnauthorized: false,
    parser: socket_io_msgpack_parser_1.default,
    withCredentials: true,
    transports: ["websocket"]
};
var handler = /** @class */ (function () {
    function handler(clientPort, clientBaseAddress) {
        if (clientBaseAddress === void 0) { clientBaseAddress = 'http://localhost'; }
        this.relaySocket = null;
        this.clientSockets = {};
        this.port = clientPort;
        this.baseAddress = clientBaseAddress;
    }
    handler.prototype.openRelaySocket = function (params, cb) {
        var _this = this;
        this.relaySocket = socket_io_client_1.default(params.relayAddress + "/reservedHybridRelayNamespace", socketParams);
        var timeouts = [];
        timeouts.push(this.waitAndCheck(3000, true, timeouts, cb));
        timeouts.push(this.waitAndCheck(1500, false, timeouts, cb));
        timeouts.push(this.waitAndCheck(1000, false, timeouts, cb));
        timeouts.push(this.waitAndCheck(500, false, timeouts, cb));
        this.relaySocket.on('connect', function () {
            console.log("new socket connection event");
            if (!_this.relaySocket) {
                return;
            }
            _this.relaySocket.emit('hybridRelayToken', {
                token: params.relayToken,
                id: params.relayId
            }, function () {
            });
            _this.relaySocket.on('relay:internal:messageForward', function (body) {
                if (!body || body.type !== 'socketEvent') {
                    _this.emitOnRelaySocket('relay:internal:error', { type: 'error', message: '' });
                }
                var namespace = body.namespace, eventName = body.eventName, eventBody = body.eventBody, queryCallbackId = body.queryCallbackId, socketCallbackId = body.socketCallbackId;
                if (!_this.clientSockets[namespace]) {
                    console.log("no namespace found for message!!");
                    return;
                }
                console.log("sending to API: " + eventName + " on " + namespace + " from relay");
                _this.clientSockets[namespace].emit(eventName, eventBody, function (error, response) {
                    var messageBody = {
                        type: 'ack',
                        error: error,
                        response: response,
                        queryId: queryCallbackId,
                        socketId: socketCallbackId
                    };
                    console.log("got server Ack!");
                    console.log(messageBody);
                    _this.emitOnRelaySocket('relay:internal:ackFromServer', messageBody);
                });
            });
            _this.relaySocket.on('relay:internal:newSocket', function (body) {
                if (!body || body.type !== 'socketNew') {
                    _this.emitOnRelaySocket('relay:internal:error', { type: 'error', message: '' });
                }
                var namespace = body.namespace;
                if (_this.clientSockets[namespace]) {
                    _this.clientSockets[namespace].disconnect();
                    delete _this.clientSockets[namespace];
                }
                console.log("creating socket: " + _this.baseAddress + ":" + _this.port + namespace);
                var socketParamsWithDevice = __assign(__assign({}, socketParams), { auth: {
                        encryptionId: body.deviceId
                    } });
                _this.clientSockets[namespace] = socket_io_client_1.default(_this.baseAddress + ":" + _this.port + namespace, socketParamsWithDevice);
                _this.clientSockets[namespace].onAny(function (eventName, eventBody) {
                    var messageBody = {
                        type: 'socketEvent',
                        eventBody: eventBody,
                        eventName: eventName,
                        namespace: namespace,
                        queryCallbackId: '',
                        socketCallbackId: '' //TODO callback to client
                    };
                    console.log("got " + eventName + " on " + namespace + " from API relaying...");
                    _this.emitOnRelaySocket('relay:internal:messageBackward', messageBody);
                });
            });
            //TODO handle closed socket
            _this.relaySocket.on('relay:internal:httpRequest', function (req) { return __awaiter(_this, void 0, void 0, function () {
                var relayId, requestId, url, method, headers, body, params_1, res, resBody, response, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!req || req.type !== 'httpRequest') {
                                return [2 /*return*/];
                            }
                            relayId = req.relayId, requestId = req.requestId, url = req.url, method = req.method, headers = req.headers, body = req.body;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            params_1 = {
                                method: method,
                                headers: headers,
                                body: undefined
                            };
                            if (body && method !== 'GET' && method !== 'HEAD') {
                                params_1.body = typeof body === 'object' ? JSON.stringify(body) : body;
                            }
                            console.log("fetching -> " + this.baseAddress + ":" + this.port + url);
                            return [4 /*yield*/, node_fetch_1.default(this.baseAddress + ":" + this.port + url, params_1)];
                        case 2:
                            res = _a.sent();
                            return [4 /*yield*/, res.text()];
                        case 3:
                            resBody = _a.sent();
                            response = {
                                type: 'httpResponse',
                                result: 'ok',
                                relayId: relayId,
                                requestId: requestId,
                                status: res.status,
                                headers: res.headers,
                                body: resBody
                            };
                            this.emitOnRelaySocket('relay:internal:httpResponse', response);
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _a.sent();
                            console.error(e_1);
                            this.emitOnRelaySocket('relay:internal:httpResponse', {
                                type: 'httpResponse',
                                result: 'error',
                                message: '',
                                relayId: relayId,
                                requestId: requestId
                            });
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            }); });
            _this.relaySocket.on('relay:internal:error', function (err) {
                console.error(err);
            });
        });
        this.relaySocket.on('disconnect', function (reason) {
            console.log(reason); //transport close
        });
    };
    handler.prototype.emitOnRelaySocket = function (eventName, eventBody) {
        if (!this.relaySocket || !this.relaySocket.connected) {
            return;
        }
        this.relaySocket.emit(eventName, eventBody);
    };
    handler.prototype.waitAndCheck = function (time, final, timeouts, cb) {
        var _this = this;
        return setTimeout(function () {
            if (_this.relaySocket && _this.relaySocket.connected) {
                timeouts.forEach(function (timeout) {
                    clearTimeout(timeout);
                });
                cb(true);
                return;
            }
            if (final) {
                cb(false);
            }
        }, time);
    };
    return handler;
}());
exports.default = handler;
//# sourceMappingURL=sockets.js.map