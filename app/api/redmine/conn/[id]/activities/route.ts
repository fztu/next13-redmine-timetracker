import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { 
    RedmineApiOptions, 
    TimeEntryActivity
} from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"
import prismadb from '@/lib/prismadb';

export async function GET(
    req: NextRequest,
    { params }
) {
    try {
        const { userId } = auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const id = params?.id ?? "";
        if (!id) {
            return new NextResponse("ID is required", { status: 400 });
        }

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
            authType: "apikey",
            apiKey: userRedmineConnection?.apiKey
        }
        const redmine = new RedmineApi(ops);
        let allActivities: TimeEntryActivity[] = []
        let activitiesResponse = await redmine.activities({});
        allActivities = [...activitiesResponse.data]
        return NextResponse.json(allActivities);
    } catch (err: any) {
        console.error(err);
        return [];
    }
}