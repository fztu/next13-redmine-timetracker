import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { 
    RedmineApiOptions, 
    Project as RedmineProject,
    TimeEntry,
    TimeEntryRequest
} from "@/lib/redmine"
import { 
    RedmineApi 
} from "@/lib/redmine"
import prismadb from '@/lib/prismadb';

export async function GET(
    req: NextRequest,
    { params }: any
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

        const url = new URL(req.url)
        const redmine_user_id = url.searchParams.get("redmine_user_id") ?? userRedmineConnection.redmineUserId;
        
        if (!redmine_user_id) {
            return new NextResponse("Redmine user id is empty", { status: 400 });
        }

        let timeEntryRequestParams = { ...params}
        timeEntryRequestParams.user_id = redmine_user_id

        const timeEntryParams: string[] = ["from", "to", "project_id", "offset", "limit"];

        timeEntryParams.map((param: string) => {
            if (url.searchParams.get(param)) {
                timeEntryRequestParams[param] = url.searchParams.get(param)
            }
        })
        console.log(timeEntryRequestParams)
        const ops: RedmineApiOptions = {
            host: userRedmineConnection?.url,
            authType: "apikey",
            apiKey: userRedmineConnection?.apiKey
        }
        const redmine = new RedmineApi(ops);
        
        let allTimeEntries: TimeEntry[] = []
        if (url.searchParams.get("offset") != undefined && url.searchParams.get("limit") !=undefined) {
            // Only retrieve specific page data
            let timeEntriesResponse = await redmine.time_entries(timeEntryRequestParams);
            allTimeEntries = [...timeEntriesResponse.data]
        } else {
            // Retrieve all data
            let offset = url.searchParams.get("offset") ?? 0
            let limit = url.searchParams.get("limit") ?? 25
            timeEntryRequestParams["offset"] = offset
            timeEntryRequestParams["limit"] = limit
            let timeEntriesResponse = await redmine.time_entries(timeEntryRequestParams);
            if (timeEntriesResponse.data && timeEntriesResponse.data.length > 0) {
                allTimeEntries = [...timeEntriesResponse.data]
                while (timeEntriesResponse.data.length > 0) {
                    timeEntryRequestParams["offset"] += limit
                    timeEntriesResponse = await redmine.time_entries(timeEntryRequestParams);
                    if (timeEntriesResponse.data && timeEntriesResponse.data.length > 0) {
                        allTimeEntries = [...allTimeEntries, ...timeEntriesResponse.data]
                    } else {
                        break;
                    }
                }
            }
        }

        return NextResponse.json(allTimeEntries);

    } catch (err: any) {
        console.error(err);
        return [];
    }
}

export async function POST(
    req: NextRequest,
    { params }: any
) {
    if (req.method === 'POST') {
        try {
            const { userId } = auth();
            const body = await req.json();
            console.log(body);

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
            // console.log(userRedmineConnection);
            if (!userRedmineConnection) {
                return new NextResponse("Redmine connection is not found", { status: 400 });
            }

            const ops: RedmineApiOptions = {
                host: userRedmineConnection?.url,
                authType: "apikey",
                apiKey: userRedmineConnection?.apiKey
            }
            const redmine = new RedmineApi(ops);

            let timeEntryParams: TimeEntryRequest = {
                spent_on: body?.spent_on ? new Date(body.spent_on).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                hours: body?.hours ? body.hours : 0,
                activity_id: body?.activity_id ? parseInt(body.activity_id) : 0,
                comments: body?.comments,
                user_id: userRedmineConnection.redmineUserId
            }

            const issueId = body?.issue_id ? parseInt(body.issue_id) : 0
            const subProjectId = body?.sub_project_id ? parseInt(body.sub_project_id) : 0
            const projectId = body?.project_id ? parseInt(body.project_id) : 0
            if (issueId > 0) {
                timeEntryParams.issue_id = issueId
            } else if (subProjectId > 0) {
                timeEntryParams.project_id = subProjectId
            } else {
                timeEntryParams.project_id = projectId
            }
            if (body?.id) {
                const timeEntryResponse = await redmine.update_time_entry(
                    parseInt(body.id),
                    {"time_entry" : timeEntryParams}
                )
                console.log(timeEntryResponse)
                return NextResponse.json(timeEntryResponse);
            } else {
                const timeEntryResponse = await redmine.create_time_entry({
                    "time_entry" : timeEntryParams
                })
                console.log(timeEntryResponse)
                return NextResponse.json(timeEntryResponse);
            }
        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}