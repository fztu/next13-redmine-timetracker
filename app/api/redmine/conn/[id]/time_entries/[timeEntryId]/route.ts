import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { 
    RedmineApiOptions, 
    User as RedmineUser 
} from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"
import prismadb from '@/lib/prismadb';

export async function DELETE(
    req: NextRequest,
    { params }: any
) {
    if (req.method === 'DELETE') {
        try {
            const { userId } = auth();
            console.log(params);
            const id = params?.id ?? "";
            const timeEntryId = params?.timeEntryId ?? "";
            if (!userId) {
                return new NextResponse("Unauthorized", { status: 401 });
            }

            if (!id) {
                return new NextResponse("Connection ID is required", { status: 400 });
            }

            if (!timeEntryId) {
                return new NextResponse("Time entry ID is required", { status: 400 });
            }

            const userRedmineConnection = await prismadb.userRedmineConnection.findUnique({
                where: {
                    id: id
                }
            });

            if (!userRedmineConnection) {
                return new NextResponse("Connection is not found", { status: 400 });
            }

            const ops: RedmineApiOptions = {
                host: userRedmineConnection?.url,
                username: userRedmineConnection?.username,
                authType: "apikey",
                apiKey: userRedmineConnection?.apiKey,
                needToDecryptApiKey: true
            }
            const redmine = new RedmineApi(ops);

            const timeEntryResponse = await redmine.delete_time_entry(timeEntryId)
            console.log(timeEntryResponse)
            return NextResponse.json(timeEntryResponse);
        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}