import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig
} from "axios"

export type RedmineApiOptions = {
    host: string
    authType: string
    apiKey?: string
    username?: string
    password?: string
}

export type RedmineResponse = {
    data: RedmineUser | [],
    status: RedmineStatusResponse
}

export type RedmineStatusResponse = {
    statusCode: number
    statusText: string
    errorText: string
    hasError: boolean
};

export type RedmineUser = {
    id: number
    login: string
    firstname: string
    lastname: string
    mail: string
    created_on: string
    last_login_on: string
    api_key: string
    status: number
    custom_fields: RedmineCustomField[]
}

export type RedmineCustomField = {
    id: number
    name: string
    value?: string
}

export class RedmineApi {
    protected _host: string
    protected _authType: string
    protected _apiKey: string
    protected _username: string
    protected _password: string

    protected _instance: AxiosInstance


    /**
   * Creates a new client wrapper around Redmine API
   *
   * @param host - Redmine URL (required).
   * @param authType - Authentication Type: apikey or password (required).
   * @param apiKey - Either API key or username + password (optional).
   * @param username - Either API key or username + password (optional).
   * @param password - Either API key or username + password (optional).
   */
    constructor(opts: RedmineApiOptions) {
        const {
            host,
            authType,
            apiKey,
            username,
            password
        } = opts

        this._host = host
        this._authType = authType ?? "apikey"
        this._apiKey = apiKey ?? ""
        this._username = username ?? ""
        this._password = password ?? ""

        this._instance = axios.create({ baseURL: this._host })

        if (
            (typeof this._apiKey === "string" && this._apiKey.trim() === "") &&
            this._authType === "apikey"
        ) {
            throw new Error('API key is required.')
        }

        if (
            (typeof this._username === "string" && this._username.trim() === "") &&
            this._authType === "password"
        ) {
            throw new Error('Username is required.')
        }

        if (
            (typeof this._password === "string" && this._password.trim() === "") &&
            this._authType === "password"
        ) {
            throw new Error('Password is required.')
        }

    }

    async request(
        method: string,
        path: string,
        params: []
    ): Promise<any> {
        const isUpload = path === '/uploads.json'
        const opts: AxiosRequestConfig = {
            method,
            params: method === 'GET' ? params : undefined,
            data: ['PATCH', 'POST', 'PUT'].includes(method) ? params : undefined,
            headers: {
                'Content-Type': !isUpload ? 'application/json' : 'application/octet-stream',
            },
            responseType: 'json'
        }

        if (this._authType == "apikey") {
            opts.headers!['X-Redmine-API-Key'] = this._apiKey
        } else if (this.username && this.password) {
            opts.auth = { username: this.username, password: this.password }
        } else {
            throw new Error('Neither api key nor username/password provided !')
        }

        return this._instance(path, opts)
    }

    async current_user(
        params: []
    ): Promise<RedmineResponse> {
        try {
            const res = await this.request("GET", "/users/current.json", params);
            return {
                data: res?.data?.user ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as RedmineResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as RedmineResponse;
        }

    }

    protected _errorHandler(
        err: any
    ): RedmineStatusResponse {
        console.error(err);
        if (axios.isAxiosError(err) && err.response) {
            return {
                statusCode: err.response?.status,
                statusText: err.response?.statusText,
                errorText: err.response?.data,
                hasError: true
            } as RedmineStatusResponse;
        } else {
            return {
                statusCode: 500,
                statusText: "Internal Server Error",
                errorText: "Internal server error (Redmine)",
                hasError: true
            } as RedmineStatusResponse;
        }
    }

    get host(): string {
        return this._host
    }

    set host(host: string) {
        this._host = host
    }

    get authType(): string {
        return this._authType
    }

    set authType(authType: string) {
        this._authType = authType
    }

    get apiKey(): string {
        return this._apiKey
    }

    set apiKey(apiKey: string) {
        this._apiKey = apiKey
    }

    get username(): string {
        return this._username
    }

    set username(username: string) {
        this._username = username
    }

    get password(): string {
        return this._password
    }

    set password(password: string) {
        this._password = password
    }

}