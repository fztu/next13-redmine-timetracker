import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs';

import type { RedmineApiOptions } from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"

export async function POST(
    req: NextRequest
) {
    if (req.method === 'POST') {
        try {
            const { userId } = auth();
            const body = await req.json();
            const { name, url, apikey} = body;

            if (!userId) {
                return new NextResponse("Unauthorized", { status: 401 });
            }
            
            const ops: RedmineApiOptions = {
                host: url,
                authType: "apikey",
                apiKey: apikey
            }
            const redmine = new RedmineApi(ops);
            const currentUser = await redmine.current_user([]);
            return NextResponse.json(currentUser);
        } catch (error: any) {
            console.error(error);
            return new NextResponse("Something is wrong", { status: 500 });
        }        
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}