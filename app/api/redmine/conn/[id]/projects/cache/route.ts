import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import prismadb from '@/lib/prismadb';

export async function POST(
    req: NextRequest,
    { params }: any
) {
    if (req.method === 'POST') {
        try {
            const { userId } = auth();
            const body = await req.json();
            // console.log(body);

            if (!userId) {
                return new NextResponse("Unauthorized", { status: 401 });
            }

            const id = params?.id ?? "";
            if (!id) {
                return new NextResponse("Connection ID is required", { status: 400 });
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

            const projects = body?.projects;
            if (projects == undefined) {
                return new NextResponse("Projects is required", { status: 400 });
            }

            const updatedUserRedmineConnection = await prismadb.userRedmineConnection.update({
                where: {
                    id: userRedmineConnection.id,
                },
                data: {
                    projects: projects
                },
            });

            return NextResponse.json({"success": true,"message": "Projects are updated successfully."});

        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}