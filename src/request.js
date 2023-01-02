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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
exports.__esModule = true;
exports.prepareEvent = exports.prepareResponse = exports.prepareRequest = exports.randomID = exports.now = exports.NostrRPCServer = exports.NostrRPC = void 0;
var nostr_tools_1 = require("nostr-tools");
var NostrRPC = /** @class */ (function () {
    function NostrRPC(opts) {
        this.relay = (0, nostr_tools_1.relayInit)(opts.relay || "wss://nostr.vulpem.com");
        this.target = opts.target;
        this.self = {
            pubkey: (0, nostr_tools_1.getPublicKey)(opts.secretKey),
            secret: opts.secretKey
        };
    }
    NostrRPC.prototype.call = function (_a) {
        var _b = _a.id, id = _b === void 0 ? randomID() : _b, method = _a.method, _c = _a.params, params = _c === void 0 ? [] : _c;
        return __awaiter(this, void 0, void 0, function () {
            var body, event;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: 
                    // connect to relay
                    return [4 /*yield*/, this.relay.connect()];
                    case 1:
                        // connect to relay
                        _d.sent();
                        this.relay.on('error', function () { throw new Error("failed to connect to ".concat(_this.relay.url)); });
                        body = prepareRequest(id, method, params);
                        return [4 /*yield*/, prepareEvent(this.self.secret, this.target, body)];
                    case 2:
                        event = _d.sent();
                        // send request via relay
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var pub = _this.relay.publish(event);
                                pub.on('failed', reject);
                                pub.on('seen', resolve);
                            })];
                    case 3:
                        // send request via relay
                        _d.sent();
                        console.log("sent request to nostr id: ".concat(event.id), { id: id, method: method, params: params });
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                // waiting for response from remote
                                // TODO: reject after a timeout
                                var sub = _this.relay.sub([{
                                        kinds: [4],
                                        authors: [_this.target],
                                        "#p": [_this.self.pubkey]
                                    }]);
                                sub.on('event', function (event) { return __awaiter(_this, void 0, void 0, function () {
                                    var plaintext, payload, ignore_1;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _a.trys.push([0, 2, , 3]);
                                                return [4 /*yield*/, nostr_tools_1.nip04.decrypt(this.self.secret, event.pubkey, event.content)];
                                            case 1:
                                                plaintext = _a.sent();
                                                payload = JSON.parse(plaintext);
                                                return [3 /*break*/, 3];
                                            case 2:
                                                ignore_1 = _a.sent();
                                                return [2 /*return*/];
                                            case 3:
                                                // ignore all the events that are not NostrRPCResponse events
                                                if (!plaintext)
                                                    return [2 /*return*/];
                                                if (!payload)
                                                    return [2 /*return*/];
                                                if (!Object.keys(payload).includes('id') || !Object.keys(payload).includes('error') || !Object.keys(payload).includes('result'))
                                                    return [2 /*return*/];
                                                // ignore all the events that are not for this request
                                                if (payload.id !== id)
                                                    return [2 /*return*/];
                                                // if the response is an error, reject the promise
                                                if (payload.error) {
                                                    reject(payload.error);
                                                }
                                                // if the response is a result, resolve the promise
                                                if (payload.result) {
                                                    resolve(payload.result);
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                }); });
                                sub.on('eose', function () {
                                    sub.unsub();
                                });
                            })];
                }
            });
        });
    };
    return NostrRPC;
}());
exports.NostrRPC = NostrRPC;
var NostrRPCServer = /** @class */ (function () {
    function NostrRPCServer(opts) {
        this.relay = (0, nostr_tools_1.relayInit)((opts === null || opts === void 0 ? void 0 : opts.relay) || "wss://nostr.vulpem.com");
        this.self = {
            pubkey: (0, nostr_tools_1.getPublicKey)(opts.secretKey),
            secret: opts.secretKey
        };
    }
    NostrRPCServer.prototype.listen = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sub;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.relay.connect()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this.relay.on('connect', resolve);
                                _this.relay.on('error', reject);
                            })];
                    case 2:
                        _a.sent();
                        sub = this.relay.sub([{
                                kinds: [4],
                                "#p": [this.self.pubkey],
                                since: now()
                            }]);
                        sub.on('event', function (event) { return __awaiter(_this, void 0, void 0, function () {
                            var plaintext, payload, ignore_2, response, body, responseEvent;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, nostr_tools_1.nip04.decrypt(this.self.secret, event.pubkey, event.content)];
                                    case 1:
                                        plaintext = _a.sent();
                                        payload = JSON.parse(plaintext);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        ignore_2 = _a.sent();
                                        return [2 /*return*/];
                                    case 3:
                                        // ignore all the events that are not NostrRPCRequest events
                                        if (!plaintext)
                                            return [2 /*return*/];
                                        if (!payload)
                                            return [2 /*return*/];
                                        if (!Object.keys(payload).includes('id') || !Object.keys(payload).includes('method') || !Object.keys(payload).includes('params'))
                                            return [2 /*return*/];
                                        return [4 /*yield*/, this.handleRequest(payload)];
                                    case 4:
                                        response = _a.sent();
                                        body = prepareResponse(response.id, response.result, response.error);
                                        return [4 /*yield*/, prepareEvent(this.self.secret, event.pubkey, body)];
                                    case 5:
                                        responseEvent = _a.sent();
                                        console.log('response to be sent', responseEvent);
                                        // send response via relay
                                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                                var pub = _this.relay.publish(responseEvent);
                                                pub.on('failed', reject);
                                                pub.on('seen', function () { return resolve(); });
                                            })];
                                    case 6:
                                        // send response via relay
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        sub.on('eose', function () {
                            sub.unsub();
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    NostrRPCServer.prototype.handleRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var id, method, params, result, error, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        id = request.id, method = request.method, params = request.params;
                        result = null;
                        error = null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this[method].apply(this, params)];
                    case 2:
                        result = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        if (e_1 instanceof Error) {
                            error = e_1.message;
                        }
                        else {
                            error = 'unknown error';
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, {
                            id: id,
                            result: result,
                            error: error
                        }];
                }
            });
        });
    };
    return NostrRPCServer;
}());
exports.NostrRPCServer = NostrRPCServer;
function now() {
    return Math.floor(Date.now() / 1000);
}
exports.now = now;
function randomID() {
    return Math.random().toString().slice(2);
}
exports.randomID = randomID;
function prepareRequest(id, method, params) {
    return JSON.stringify({
        id: id,
        method: method,
        params: params
    });
}
exports.prepareRequest = prepareRequest;
function prepareResponse(id, result, error) {
    return JSON.stringify({
        id: id,
        result: result,
        error: error
    });
}
exports.prepareResponse = prepareResponse;
function prepareEvent(secretKey, pubkey, content) {
    return __awaiter(this, void 0, void 0, function () {
        var cipherText, event, id, sig, signedEvent, ok, veryOk;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, nostr_tools_1.nip04.encrypt(secretKey, pubkey, content)];
                case 1:
                    cipherText = _a.sent();
                    event = {
                        kind: 4,
                        created_at: now(),
                        pubkey: (0, nostr_tools_1.getPublicKey)(secretKey),
                        tags: [['p', pubkey]],
                        content: cipherText
                    };
                    id = (0, nostr_tools_1.getEventHash)(event);
                    sig = (0, nostr_tools_1.signEvent)(event, secretKey);
                    signedEvent = __assign(__assign({}, event), { id: id, sig: sig });
                    ok = (0, nostr_tools_1.validateEvent)(signedEvent);
                    veryOk = (0, nostr_tools_1.verifySignature)(signedEvent);
                    if (!ok || !veryOk) {
                        throw new Error('Event is not valid');
                    }
                    return [2 /*return*/, signedEvent];
            }
        });
    });
}
exports.prepareEvent = prepareEvent;
