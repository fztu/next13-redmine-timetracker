import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server';

import type { User as RedmineUser } from "@/lib/redmine"
import prismadb from '@/lib/prismadb';

export async function GET(
  req: NextRequest
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userRedmineConnections = await prismadb.userRedmineConnection.findMany({
            where: {
                userId: userId,
                deleted: 0
            }
        });
        // console.log(userRedmineConnections);
        // await new Promise(resolve => setTimeout(resolve, 5000));
        return NextResponse.json(userRedmineConnections);
    } catch (err: any) {
        console.error(err);
        return new NextResponse("Something is wrong", { status: 500 });
    }
}