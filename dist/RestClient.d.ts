/// <reference types="node" />
import { EventEmitter } from 'events';
import { URLSearchParams } from 'url';
interface AuthProvider {
    getLoginParams(user: string, password: string): Promise<URLSearchParams>;
}
export declare class ApiEndpoint implements AuthProvider {
    apiUrl: string;
    constructor(apiUrl: string);
    getApiUrl(): string;
    getLoginParams(user: string, password: string): Promise<URLSearchParams>;
}
export declare class JWTEndpoint extends ApiEndpoint {
    private accessTokenUrl;
    private jwtUrl;
    private accessTokenBasic;
    private http;
    constructor(apiUrl: string, accessTokenUrl: string, jwtUrl: string, accessTokenBasic: string);
    getLoginParams(user: string, password: string): Promise<URLSearchParams>;
    private getAccessToken;
    getJwt(token: string): Promise<any>;
}
export default class RestClient extends EventEmitter {
    private readonly user;
    private readonly password;
    private readonly endpoint;
    private http;
    private authRequest?;
    private isLogged;
    private badCredentials;
    constructor(user: string, password: string, endpoint: ApiEndpoint);
    get(url: string): any;
    post(url: string, data?: Record<string, unknown>): any;
    put(url: string, data?: Record<string, unknown>): any;
    delete(url: string): any;
    private request;
}
export {};
//# sourceMappingURL=RestClient.d.ts.map