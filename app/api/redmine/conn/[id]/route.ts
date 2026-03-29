import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server';

import prismadb from '@/lib/prismadb';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (req.method === 'DELETE') {
        try {
            const { userId } = await auth();
            const { id } = await params;
            console.log(id);
            if (!userId) {
                return new NextResponse("Unauthorized", { status: 401 });
            }

            if (!id) {
                return new NextResponse("ID is required", { status: 400 });
            }

            const userRedmineConnection = await prismadb.userRedmineConnection.findUnique({
                where: {
                    id: id
                }
            });

            if (!userRedmineConnection) {
                return new NextResponse("ID is not found", { status: 400 });
            }

            console.log(userRedmineConnection);

            await prismadb.userRedmineConnection.delete({
                where: {
                    id: id
                }
            })

            const result = {
                data: [],
                status: {
                    statusCode: 200,
                    statusText: "Delete",
                    errorText: "",
                    hasError: false
                }
            }
            
            return NextResponse.json(result);
        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}