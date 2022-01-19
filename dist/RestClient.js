"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTEndpoint = exports.ApiEndpoint = void 0;
const axios_1 = __importDefault(require("axios"));
const events_1 = require("events");
const url_1 = require("url");
const Client_1 = require("./Client");
const API_LOCKDOWN_DELAY = 6;
class ApiEndpoint {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }
    getApiUrl() {
        return this.apiUrl;
    }
    async getLoginParams(user, password) {
        const params = new url_1.URLSearchParams();
        params.append('userId', user);
        params.append('userPassword', password);
        return params;
    }
}
exports.ApiEndpoint = ApiEndpoint;
class JWTEndpoint extends ApiEndpoint {
    constructor(apiUrl, accessTokenUrl, jwtUrl, accessTokenBasic) {
        super(apiUrl);
        this.accessTokenUrl = accessTokenUrl;
        this.jwtUrl = jwtUrl;
        this.accessTokenBasic = accessTokenBasic;
        this.http = axios_1.default.create();
    }
    async getLoginParams(user, password) {
        const accesToken = await this.getAccessToken(user, password);
        const jwt = await this.getJwt(accesToken);
        const params = new url_1.URLSearchParams();
        params.append('jwt', jwt);
        return params;
    }
    async getAccessToken(user, password) {
        const headers = {
            'Authorization': `Basic ${this.accessTokenBasic}`,
        };
        const params = new url_1.URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', user);
        params.append('password', password);
        const result = await this.http.post(this.accessTokenUrl, params, { headers });
        return result.data.access_token;
    }
    async getJwt(token) {
        const headers = {
            'Authorization': `Bearer ${token}`,
        };
        const result = await this.http.get(this.jwtUrl, { headers });
        return result.data.trim();
    }
}
exports.JWTEndpoint = JWTEndpoint;
class RestClient extends events_1.EventEmitter {
    constructor(user, password, endpoint) {
        super();
        this.user = user;
        this.password = password;
        this.endpoint = endpoint;
        this.isLogged = false;
        this.badCredentials = false;
        this.http = axios_1.default.create({
            baseURL: this.endpoint.apiUrl,
            withCredentials: true,
        });
        this.http.interceptors.request.use(request => {
            var _a;
            Client_1.logger.debug((_a = request.method) === null || _a === void 0 ? void 0 : _a.toUpperCase(), request.url);
            return request;
        });
    }
    get(url) {
        return this.request({
            method: 'get',
            url: url,
        });
    }
    post(url, data) {
        return this.request({
            method: 'post',
            url: url,
            data: data,
        });
    }
    put(url, data) {
        return this.request({
            method: 'put',
            url: url,
            data: data,
        });
    }
    delete(url) {
        return this.request({
            method: 'delete',
            url: url,
        });
    }
    request(options) {
        if (this.badCredentials) {
            throw 'API client locked. Please check your credentials then restart.\n'
                + 'If your credentials are valid, please wait some hours to be unbanned';
        }
        let request;
        if (this.isLogged) {
            request = this.http(options);
        }
        else {
            if (this.authRequest === undefined) {
                this.authRequest = this.endpoint.getLoginParams(this.user, this.password)
                    .then((params) => this.http.post('/login', params))
                    .then((response) => {
                    this.isLogged = true;
                    if (response.headers['set-cookie']) {
                        this.http.defaults.headers.common['Cookie'] = response.headers['set-cookie'];
                    }
                    this.emit('connect');
                }).finally(() => {
                    this.authRequest = undefined;
                });
            }
            request = this.authRequest.then(() => this.http(options));
        }
        return request
            .then((response) => response.data)
            .catch((error) => {
            if (error.response) {
                if (error.response.status === 401) { // Reauthenticate
                    if (this.isLogged) {
                        this.isLogged = false;
                        this.emit('disconnect');
                        return this.request(options);
                    }
                    else {
                        if (error.response.data.errorCode === 'AUTHENTICATION_ERROR') {
                            this.badCredentials = true;
                            Client_1.logger.warn('API client will be locked for '
                                + API_LOCKDOWN_DELAY
                                + ' hours because of bad credentials or temporary service outage.'
                                + ' You can restart plugin to force login retry.');
                            setTimeout(() => {
                                this.badCredentials = false;
                            }, API_LOCKDOWN_DELAY * 60 * 60 * 1000);
                        }
                        throw error.response.data.error;
                    }
                }
                else {
                    //logger.debug(error.response.data);
                    let msg = 'Error ' + error.response.status;
                    const json = error.response.data;
                    if (json && json.error) {
                        msg += ' ' + json.error;
                    }
                    if (json && json.errorCode) {
                        msg += ' (' + json.errorCode + ')';
                    }
                    Client_1.logger.debug(msg);
                    throw msg;
                }
            }
            else if (error.message) {
                Client_1.logger.debug('Error:', error.message);
                throw error.message;
            }
            else {
                Client_1.logger.debug('Error:', error);
                throw error;
            }
        });
    }
}
exports.default = RestClient;
//# sourceMappingURL=RestClient.js.map