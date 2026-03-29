import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server';

import type { 
    RedmineApiOptions, 
    TimeEntryActivity
} from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"
import prismadb from '@/lib/prismadb';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        const userRedmineConnection = await prismadb.userRedmineConnection.findUnique({
            where: {
                id: id
            }
        });
        if (!userRedmineConnection) {
            return new NextResponse("Redmine connection is not found", { status: 400 });
        }

        const ops: RedmineApiOptions = {
            host: userRedmineConnection?.url,
            username: userRedmineConnection?.username,
            authType: "apikey",
            apiKey: userRedmineConnection?.apiKey,
            needToDecryptApiKey: true
        }
        const redmine = new RedmineApi(ops);
        let allActivities: TimeEntryActivity[] = []
        let activitiesResponse = await redmine.activities({});
        allActivities = [...activitiesResponse.data]
        return NextResponse.json(allActivities);
    } catch (err: any) {
        console.error(err);
        return new NextResponse("Something is wrong", { status: 500 });
    }
}