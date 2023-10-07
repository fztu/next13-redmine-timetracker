"use client";

import axios from 'axios'
import useSWR from 'swr'
import { useUser } from "@clerk/nextjs";
import { DateRange } from "react-day-picker"
import { addDays } from 'date-fns';

import { UserRedmineConnection } from "@prisma/client"
import { Loader2 } from 'lucide-react';

interface HoursSummaryProps {
    date: DateRange | undefined,
    redmineConnection: UserRedmineConnection
}

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const HoursSummary = ({
    date,
    redmineConnection
}: HoursSummaryProps) => {

    const { isSignedIn, user, isLoaded } = useUser();

    const params = {
        "userId": user?.id ?? "",
        "from": date?.from ? date.from.toISOString().split('T')[0] : addDays(new Date(), -7).toISOString().split('T')[0],
        "to": date?.to ? date.to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }

    const usp = new URLSearchParams(params);
    usp.sort();
    const qs = usp.toString();

    const {
        data,
        isLoading,
        isValidating,
        error
    } = useSWR(
        `/api/redmine/conn/${redmineConnection?.id}/time_entries?${qs}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    console.log(data);

    return (
        <div className="flex items-center p-2">
            <div className="ml-0 font-medium">
                <p className="text-sm font-medium leading-none">{redmineConnection?.name}</p>
                <p className="text-sm text-muted-foreground">{redmineConnection?.url}</p>
                <p className="text-sm text-muted-foreground">{redmineConnection?.username}</p>
            </div>
            {(isLoading || isValidating) &&
                <Loader2 className="ml-auto h-8 w-8 animate-spin" />
            }
            {(error) && 
                <div className="ml-auto mt-0 font-medium text-red-800">Failed to load</div>
            }
            { (data != undefined) &&
                <div className="ml-auto mt-0 font-medium">{data.reduce((a, {hours}) => a + hours, 0)}</div>
            }
        </div>
    )
}

export default HoursSummary