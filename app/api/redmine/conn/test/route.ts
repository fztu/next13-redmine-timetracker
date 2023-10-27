import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { RedmineApiOptions } from "@/lib/redmine"
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

            // There are url, and apikey from frontend form
            if (url && apikey) {
                const ops: RedmineApiOptions = {
                    host: url,
                    authType: "apikey",
                    apiKey: apikey
                }
                const redmine = new RedmineApi(ops);
                const currentUser = await redmine.current_user([]);
                return NextResponse.json(currentUser);
            }

            // There are url, username, and password from frontend form
            if (url && username && password) {
                const ops: RedmineApiOptions = {
                    host: url,
                    authType: "password",
                    username: username,
                    password: password
                }
                const redmine = new RedmineApi(ops);
                const currentUser = await redmine.current_user([]);
                return NextResponse.json(currentUser);
            }

            // id is passed from frontend
            if ( id ) {
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
                const currentUser = await redmine.current_user([]);
                return NextResponse.json(currentUser);
            }

            return new NextResponse("Not enough parameters.", { status: 400 });
            
        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }        
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}