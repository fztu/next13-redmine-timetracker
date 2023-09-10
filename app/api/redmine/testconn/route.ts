import { NextRequest, NextResponse } from 'next/server'

import type { 
    RedmineApiOptions, 
    RedmineUser 
} from "@/lib/redmine"
import { RedmineApi } from "@/lib/redmine"

const user: RedmineUser = {
    "id": 5,
    "login": "sandy.tu",
    "firstname": "Sandy",
    "lastname": "Tu",
    "mail": "sandy.tu@silksoftware.com",
    "created_on": "2016-08-18T03:52:37.000Z",
    "last_login_on": "2023-09-06T16:08:07.146-07:00",
    "api_key": "8088d8fc19c40df7cc6d03cec156ee9f385e8136",
    "status": 1,
    "custom_fields": [
        {
            "id": 22,
            "name": "Group",
            "value": "US Dev Group"
        },
        {
            "id": 23,
            "name": "Employee ID"
        }
    ]
}

export async function POST(
    req: NextRequest
) {
    if (req.method === 'POST') {
        const body = await req.json();
        console.log(body);
        const { name, url, apikey} = body;
        console.log(url);
        console.log(apikey);
        const ops: RedmineApiOptions = {
            host: url,
            authType: "apikey",
            apiKey: apikey
        }

        const redmine = new RedmineApi(ops);
        const currentUser = await redmine.current_user([]);
        console.log(currentUser);
        return NextResponse.json(currentUser);
    } else {
        return new NextResponse("Method is not allowed", { status: 405 });
    }
}