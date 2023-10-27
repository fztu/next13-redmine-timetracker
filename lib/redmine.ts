import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig
} from "axios"
import crypto from "crypto"

export type RedmineApiOptions = {
    host: string
    authType: string
    apiKey?: string
    username?: string
    password?: string
    needToDecryptApiKey?: boolean
}

export type UserResponse = {
    data: User | {},
    status: StatusResponse
}

export type StatusResponse = {
    statusCode: number
    statusText: string
    errorText: string
    hasError: boolean
};

export type User = {
    id: number
    login: string
    firstname: string
    lastname: string
    mail: string
    created_on: string
    last_login_on: string
    api_key: string
    status: number
    custom_fields: CustomField[]
}

export type ProjectResponse = {
    data: Project[] | [],
    status: StatusResponse
}

export interface Project {
    id: number
    name: string
    identifier: string
    description: string
    parent?: {
        id: number
        name: string
    }
    children?: {
        id: number
        name: string
    }[]
    status: number
    custom_fields: CustomField[]
    created_on: string
    updated_on: string
}

export type CustomField = {
    id: number
    name: string
    value?: string
}

export type TimeEntryActivityResponse = {
    data: TimeEntryActivity[] | [],
    status: StatusResponse
}

export interface TimeEntryActivity {
    id: number
    name: string
}

export interface TimeEntryRequest {
    project_id?: number
    issue_id?: number
    spent_on: string
    hours: number
    activity_id: number
    comments: string
    user_id: number
}

export type TimeEntryResponse = {
    data: TimeEntry[] | [],
    status: StatusResponse
}

export interface TimeEntry {
    id: number
    project: {
        id: number
        name: string
    }
    issue?: {
        id: number
    }
    user: {
        id: number
        name: string
    }
    activity: {
        id: number
        name: string
    }
    hours: number
    comments: string
    spent_on: string
    created_on: string
    updated_on: string
    custom_fields?: CustomField[]
}

export class RedmineApi {
    protected _host: string
    protected _authType: string
    protected _apiKey: string
    protected _username: string
    protected _password: string
    protected _needToDecryptApiKey: boolean

    protected _instance: AxiosInstance

    protected _algorithm = 'aes-256-cbc'; //Using AES encryption
    protected _key = process.env?.ENCRYPTION_KEY ?? "";
    protected _iv: Buffer;

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
            password,
            needToDecryptApiKey
        } = opts

        this._host = host
        this._authType = authType ?? "apikey"
        this._apiKey = apiKey ?? ""
        this._username = username ?? ""
        this._password = password ?? ""
        this._needToDecryptApiKey = needToDecryptApiKey ?? false
        this._iv = username ? crypto.createHash('md5').update(username).digest() : crypto.randomBytes(16);

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
        params: {}
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
            let apikey = this._apiKey;
            if (this._needToDecryptApiKey) {
                apikey = this._decrypt(apikey)
            }
            opts.headers!['X-Redmine-API-Key'] = apikey
        } else if (this.username && this.password) {
            opts.auth = { username: this.username, password: this.password }
        } else {
            throw new Error('Neither api key nor username/password provided !')
        }

        return this._instance(path, opts)
    }

    /**
     * Returns current user details
     * http://www.redmine.org/projects/redmine/wiki/Rest_Users#GET-2
     */
    async current_user(
        params: {}
    ): Promise<UserResponse> {
        try {
            const res = await this.request("GET", "/users/current.json", params);
            const user = res?.data?.user ?? {};
            if (user && user?.api_key) {
                user.api_key = this._encrypt(user.api_key)
            }
            return {
                data: res?.data?.user ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as UserResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as UserResponse;
        }
    }

    // REST API for Projects (Stable)
    /**
     * Listing projects
     * http://www.redmine.org/projects/redmine/wiki/Rest_Projects#Listing-projects
     */
    async projects(
        params: {}
    ): Promise<ProjectResponse> {
        try {
            const res = await this.request("GET", "/projects.json", params);
            return {
                data: res?.data?.projects ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as ProjectResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as ProjectResponse;
        }
    }

    /**
     * Returns the list of time entry activities.
     * http://www.redmine.org/projects/redmine/wiki/Rest_Enumerations#GET-2
     */
    async activities(
        params: {}
    ): Promise<TimeEntryActivityResponse> {
        try {
            const res = await this.request("GET", "/enumerations/time_entry_activities.json", params);
            return {
                data: res?.data?.time_entry_activities ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as TimeEntryActivityResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as TimeEntryActivityResponse;
        }
    }

    // REST API for Time Entries (Stable)
    /**
     * Listing time entries
     * http://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries#Listing-time-entries
     */
    async time_entries(
        params: {}
    ): Promise<TimeEntryResponse> {
        try {
            const res = await this.request("GET", "/time_entries.json", params);
            return {
                data: res?.data?.time_entries ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as TimeEntryResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as TimeEntryResponse;
        }
    }

    /**
     * Creating a time entry
     * http://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries#Creating-a-time-entry
     */
    async create_time_entry (
        params: {}
    ): Promise<TimeEntryResponse> {
        try {
            const res = await this.request("POST", "/time_entries.json", params);
            return {
                data: res?.data?.time_entries ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as TimeEntryResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as TimeEntryResponse;
        }
    }

    /**
     * Updating a time entry
     * http://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries#Updating-a-time-entry
     */
    async update_time_entry (
        id: number,
        params: {}
    ): Promise<TimeEntryResponse> {
        try {
            const res = await this.request("PUT", `/time_entries/${id}.json`, params);
            return {
                data: res?.data?.time_entries ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as TimeEntryResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as TimeEntryResponse;
        }
    }

    /**
     * Deleting a time entry
     * http://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries#Deleting-a-time-entry
     */
    async delete_time_entry (
        id: number
    ): Promise<TimeEntryResponse> {
        try {
            const res = await this.request("DELETE", `/time_entries/${id}.json`, {});
            return {
                data: res?.data?.time_entries ?? [],
                status: {
                    statusCode: res?.status,
                    statusText: res?.statusText,
                    errorText: "",
                    hasError: false
                }
            } as TimeEntryResponse;
        } catch (err) {
            return {
                data: [],
                status: this._errorHandler(err)
            } as TimeEntryResponse;
        }
    }


    protected _errorHandler(
        err: any
    ): StatusResponse {
        console.error(err);
        if (axios.isAxiosError(err) && err.response) {
            return {
                statusCode: err.response?.status,
                statusText: err.response?.statusText,
                errorText: err.response?.data,
                hasError: true
            } as StatusResponse;
        } else {
            return {
                statusCode: 500,
                statusText: "Internal Server Error",
                errorText: "Internal server error (Redmine)",
                hasError: true
            } as StatusResponse;
        }
    }

    //Encrypting text
    protected _encrypt(text: string) {
        // console.log(this._key)
        // console.log(this._iv)
        let cipher = crypto.createCipheriv(this._algorithm, this._key, this._iv);
        let encryptedText = cipher.update(text, "utf-8", "hex");
        encryptedText += cipher.final("hex");
        return encryptedText
    }

    // Decrypting text
    protected _decrypt(text: string) {
        let decipher = crypto.createDecipheriv(this._algorithm, this._key, this._iv);
        let decryptedData = decipher.update(text, "hex", "utf-8");
        decryptedData += decipher.final("utf8");
        return decryptedData;
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

    get needToDecryptApiKey(): boolean {
        return this._needToDecryptApiKey
    }

    set needToDecryptApiKey(needToDecryptApiKey: boolean) {
        this._needToDecryptApiKey = needToDecryptApiKey
    }

}