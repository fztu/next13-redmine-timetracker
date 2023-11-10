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

    /**
     * Makes an asynchronous HTTP request to the specified path using the given method and parameters.
     * @param {string} method - The HTTP method to use for the request (e.g., GET, POST, PUT, PATCH).
     * @param {string} path - The path of the resource to request.
     * @param {object} params - The parameters to include in the request.
     * @returns {Promise<any>} - A promise that resolves to the response data.
     * @throws {Error} - If neither an API key nor a username/password is provided.
     */
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
    /**
     * Retrieves the current user information from the server.
     * @param {Object} params - Additional parameters for the API request.
     * @returns {Promise<UserResponse>} A promise that resolves to a UserResponse object containing the user data and status information.
     * @throws {Error} If there is an error during the API request.
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
    /**
     * Retrieves a list of projects from the server.
     * @param {Object} params - Additional parameters for the request.
     * @returns {Promise<ProjectResponse>} A promise that resolves to a ProjectResponse object containing the project data and status information.
     * @throws {Error} If an error occurs during the request.
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
    /**
     * Retrieves a list of time entry activities.
     * @param {Object} params - Additional parameters for the request.
     * @returns {Promise<TimeEntryActivityResponse>} A promise that resolves to a response object containing the time entry activities.
     * @throws {Error} If an error occurs during the request.
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
    /**
     * Retrieves time entries from the server based on the provided parameters.
     * @param {Object} params - The parameters for the time entries request.
     * @returns {Promise<TimeEntryResponse>} A promise that resolves to a TimeEntryResponse object containing the retrieved time entries and the status of the request.
     * @throws {Error} If an error occurs during the request.
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
    /**
     * Creates a time entry by making a POST request to the "/time_entries.json" endpoint.
     * @param {Object} params - The parameters for the time entry.
     * @returns {Promise<TimeEntryResponse>} A promise that resolves to a TimeEntryResponse object.
     * The TimeEntryResponse object contains the data of the created time entry and the status of the request.
     * If the request is successful, the data property will contain an array of time entries and the status property
     * will have statusCode, statusText, errorText, and hasError properties. If there is an error, the data property
     * will be an empty array and the status property will be the result of the _errorHandler method.
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
    /**
     * Updates a time entry with the specified ID using the provided parameters.
     * @param {number} id - The ID of the time entry to update.
     * @param {object} params - The parameters to update the time entry with.
     * @returns {Promise<TimeEntryResponse>} A promise that resolves to a TimeEntryResponse object.
     * The TimeEntryResponse object contains the updated time entry data and the status of the update.
     * If the update is successful, the data field will contain the updated time entry data and the
     * status field will have statusCode and statusText properties indicating the success. If the update
     * fails, the data field will be an empty array and the status field will contain error information.
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
    /**
     * Deletes a time entry with the specified ID.
     * @param {number} id - The ID of the time entry to delete.
     * @returns {Promise<TimeEntryResponse>} A promise that resolves to a TimeEntryResponse object.
     * The TimeEntryResponse object contains the deleted time entry data and the status of the deletion.
     * If the deletion is successful, the data property will contain the deleted time entry data and the
     * status property will have statusCode and statusText properties indicating the success status.
     * If an error occurs during the deletion, the data property will be an empty array and the status
     * property will contain error information.
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


    /**
     * Handles errors that occur during an API request and returns a standardized response object.
     * @param {any} err - The error object that was thrown.
     * @returns {StatusResponse} - The standardized response object containing the error details.
     */
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
    /**
     * Encrypts the given text using the specified algorithm, key, and initialization vector.
     * @param {string} text - The text to encrypt.
     * @returns {string} The encrypted text.
     */
    protected _encrypt(text: string) {
        // console.log(this._key)
        // console.log(this._iv)
        let cipher = crypto.createCipheriv(this._algorithm, this._key, this._iv);
        let encryptedText = cipher.update(text, "utf-8", "hex");
        encryptedText += cipher.final("hex");
        return encryptedText
    }

    // Decrypting text
    /**
     * Decrypts the given text using the specified algorithm, key, and initialization vector.
     * @param {string} text - The text to decrypt.
     * @returns The decrypted data.
     */
    protected _decrypt(text: string) {
        let decipher = crypto.createDecipheriv(this._algorithm, this._key, this._iv);
        let decryptedData = decipher.update(text, "hex", "utf-8");
        decryptedData += decipher.final("utf8");
        return decryptedData;
    }

    /**
     * Get the host value.
     * @returns {string} The host value.
     */
    get host(): string {
        return this._host
    }

    /**
     * Setter method for the host property.
     * @param {string} host - The new value for the host property.
     * @returns None
     */
    set host(host: string) {
        this._host = host
    }

    /**
     * Get the authentication type.
     * @returns {string} The authentication type.
     */
    get authType(): string {
        return this._authType
    }

    /**
     * Setter method for the authentication type.
     * @param {string} authType - The authentication type to set.
     * @returns None
     */
    set authType(authType: string) {
        this._authType = authType
    }

    /**
     * Get the API key.
     * @returns {string} The API key.
     */
    get apiKey(): string {
        return this._apiKey
    }

    /**
     * Setter method for the API key.
     * @param {string} apiKey - The API key to set.
     * @returns None
     */
    set apiKey(apiKey: string) {
        this._apiKey = apiKey
    }

    /**
     * Get the username.
     * @returns {string} The username.
     */
    get username(): string {
        return this._username
    }

    /**
     * Setter method for the username property.
     * @param {string} username - The new value for the username.
     * @returns None
     */
    set username(username: string) {
        this._username = username
    }

    /**
     * Getter method for retrieving the password.
     * @returns {string} The password value.
     */
    get password(): string {
        return this._password
    }

    /**
     * Setter method for the password property.
     * @param {string} password - The new password value.
     * @returns None
     */
    set password(password: string) {
        this._password = password
    }

    /**
     * Getter method for the needToDecryptApiKey property.
     * @returns {boolean} - Indicates whether the API key needs to be decrypted.
     */
    get needToDecryptApiKey(): boolean {
        return this._needToDecryptApiKey
    }

    /**
     * Setter method for the needToDecryptApiKey property.
     * @param {boolean} needToDecryptApiKey - The new value for the needToDecryptApiKey property.
     * @returns None
     */
    set needToDecryptApiKey(needToDecryptApiKey: boolean) {
        this._needToDecryptApiKey = needToDecryptApiKey
    }

}