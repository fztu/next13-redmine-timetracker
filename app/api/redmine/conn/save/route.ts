import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { 
    RedmineApiOptions, 
    User as RedmineUser, 
    UserResponse
} from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"
import prismadb from '@/lib/prismadb';

export async function POST(
    req: NextRequest
) {
    if (req.method === 'POST') {
        try {
            const { userId } = auth();
            const body = await req.json();
            console.log(body);
            const { id, name, url, apikey, username, password} = body;

            if (!userId) {
                return new NextResponse("Unauthorized", { status: 401 });
            }

            const userRedmineConnection = await prismadb.userRedmineConnection.findFirst({
                where: {
                    userId: userId,
                    url: url,
                    deleted: 0
                }
            });

            if (id) {
                const userRedmineConnection = await prismadb.userRedmineConnection.findUnique({
                    where: {
                        id: id
                    }
                });
            }

            console.log(userRedmineConnection);

            let currentUser = undefined;
            // There are url, and apikey from frontend form
            if (url && apikey) {
                const ops: RedmineApiOptions = {
                    host: url,
                    authType: "apikey",
                    apiKey: apikey
                }
                const redmine = new RedmineApi(ops);
                currentUser = await redmine.current_user([]);
            } else if (url && username && password) {
                const ops: RedmineApiOptions = {
                    host: url,
                    authType: "password",
                    username: username,
                    password: password
                }
                const redmine = new RedmineApi(ops);
                currentUser = await redmine.current_user([]);
            } else if ( id ) {
                const userRedmineConnection = await prismadb.userRedmineConnection.findUnique({
                    where: {
                        id: id
                    }
                });
                if (!userRedmineConnection) {
                    return new NextResponse("Connection ID is not found", { status: 400 });
                }
                const ops: RedmineApiOptions = {
                    host: url,
                    username: userRedmineConnection?.username,
                    authType: "apikey",
                    apiKey: apikey ?? userRedmineConnection.apiKey, // if apikey is submitted, use the submitted value, otherwise use the value in database
                    needToDecryptApiKey: apikey ? false : true // if apikey is submitted, do not need to decrypt.
                }
                const redmine = new RedmineApi(ops);
                currentUser = await redmine.current_user([]);
            }

            if (currentUser?.status?.hasError === false && currentUser?.data) {
                const redmineUser = currentUser.data as RedmineUser;
                if (userRedmineConnection) {
                    // update
                    await prismadb.userRedmineConnection.update({
                        where: {
                            id: userRedmineConnection.id,
                        },
                        data: {
                            url: url,
                            username: redmineUser.login ?? "",
                            apiKey: redmineUser.api_key ?? "",
                            redmineUserId: redmineUser.id ?? 0,
                            firstname: redmineUser.firstname ?? "",
                            lastname: redmineUser.lastname ?? "",
                            redmineEmail: redmineUser.mail ?? "",
                            redmineCreatedOn: redmineUser.created_on ?? "1970-01-01T00:00:00.000Z",
                            redmineLastLoginOn: redmineUser.last_login_on ?? "1970-01-01T00:00:00.000Z",
                        },
                    })
                } else {
                    // create
                    await prismadb.userRedmineConnection.create({
                        data: {
                            userId: userId,
                            name: name,
                            url: url,
                            username: redmineUser.login ?? "",
                            password: "",
                            apiKey: redmineUser.api_key ?? "",
                            redmineUserId: redmineUser.id ?? 0,
                            firstname: redmineUser.firstname ?? "",
                            lastname: redmineUser.lastname ?? "",
                            redmineEmail: redmineUser.mail ?? "",
                            redmineCreatedOn: redmineUser.created_on ?? "1970-01-01T00:00:00.000Z",
                            redmineLastLoginOn: redmineUser.last_login_on ?? "1970-01-01T00:00:00.000Z",
                            projects: ""
                        }
                    })
                }
            }

            return NextResponse.json(currentUser);
        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}