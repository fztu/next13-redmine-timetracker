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
        let offset = 0
        let limit = 100
        let allProjects: RedmineProject[] = []
        let level1Projects: RedmineProject[] = [];
        // let level2Projects: RedmineProject[] = [];
        let projectsResponse = await redmine.projects({
            offset: offset,
            limit: limit
        });

        if (projectsResponse.data && projectsResponse.data.length > 0) {
            allProjects = [...projectsResponse.data]
            while (projectsResponse.data.length > 0) {
                offset += limit
                projectsResponse = await redmine.projects({
                    offset: offset,
                    limit: limit
                });
                if (projectsResponse.data && projectsResponse.data.length > 0) {
                    allProjects = [...allProjects, ...projectsResponse.data]
                } else {
                    break;
                }
            }
        }

        if (allProjects.length > 0) {
            let activeProjects = allProjects.filter(p => p.status == 1);
            activeProjects.forEach((p, idx) => {
                // console.log(p);
                if (p.parent?.id) {
                } else {
                    let children = activeProjects.filter(obj => {
                        return obj?.parent?.id == p.id
                    });
                    p.children = children;
                    level1Projects.push(p);
                }
            });
        }

        const updatedUserRedmineConnection = await prismadb.userRedmineConnection.update({
            where: {
                id: userRedmineConnection.id,
            },
            data: {
                projects: JSON.stringify(level1Projects)
            },
        });

        return NextResponse.json(level1Projects);
    } catch (err: any) {
        console.error(err);
        return [];
    }
}