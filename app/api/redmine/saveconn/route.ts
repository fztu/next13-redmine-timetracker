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
            const { name, url, apikey } = body;

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

            console.log(userRedmineConnection);

            const ops: RedmineApiOptions = {
                host: url,
                authType: "apikey",
                apiKey: apikey
            }
            const redmine = new RedmineApi(ops);
            const currentUser = await redmine.current_user([]);

            if (currentUser?.status?.hasError === false) {
                if (userRedmineConnection) {
                    // update
                    await prismadb.userRedmineConnection.update({
                        where: {
                            id: userRedmineConnection.id,
                        },
                        data: {
                            url: url,
                            apiKey: apikey // will implement encryption
                        },
                    })
                } else {
                    // create
                    await prismadb.userRedmineConnection.create({
                        data: {
                            userId: userId,
                            name: name,
                            url: url,
                            username: "",
                            password: "",
                            apiKey: apikey, // Will implement encryption
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