import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { 
    RedmineApiOptions, 
    Project as RedmineProject
} from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"
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

        const ops: RedmineApiOptions = {
            host: userRedmineConnection?.url,
            username: userRedmineConnection?.username,
            authType: "apikey",
            apiKey: userRedmineConnection?.apiKey,
            needToDecryptApiKey: true
        }
        const redmine = new RedmineApi(ops);
        const projectsParams: string[] = ["offset", "limit"];
        let projectsRequestParams = { ...params}
        // After Redmine upgrade to 5.x id parameter is causing issue
        if (projectsRequestParams?.id) delete projectsRequestParams.id;
        const url = new URL(req.url)
        projectsParams.map((param: string) => {
            if (url.searchParams.get(param)) {
                projectsRequestParams[param] = url.searchParams.get(param)
            }
        })
        let projectsResponse = await redmine.projects(projectsRequestParams);
        return NextResponse.json(projectsResponse);
    } catch (err: any) {
        console.error(err);
        return [];
    }
}