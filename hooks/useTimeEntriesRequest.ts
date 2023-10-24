"use client"

import useSWR from 'swr'
import axios from 'axios'
import { DateRange } from "react-day-picker";
import { addDays } from 'date-fns';
import { useUser } from '@clerk/nextjs';

import { TTimeEntries } from "@/types/index"
import { UserRedmineConnection } from '@prisma/client';

const fetchTimeEntriesWithConnection = (params: { url: string, connections: UserRedmineConnection[] }) => {
    const url = params.url
    const connections = params.connections
    const f = (url: string, conn: UserRedmineConnection) => {
        const connectionId = conn.id
        const newUrl = url.replace('CONNECTIONID', connectionId);
        return axios.get(newUrl)
            .then((res) => ({ connectionId: connectionId, data: res.data } as TTimeEntries));
    }
    return Promise.all(connections.map(conn => f(url, conn)))
}

const useTimeEntriesRequest = (
    date: DateRange | undefined,
    redmineConnections: UserRedmineConnection[] | undefined
) => {
    const { isSignedIn, user, isLoaded } = useUser();

    let params = {
        "userId": user?.id ?? "",
        "from": date?.from ? date.from.toISOString().split('T')[0] : addDays(new Date(), -7).toISOString().split('T')[0],
        "to": date?.to ? date.to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }

    let usp = new URLSearchParams(params);
    usp.sort();
    let qs = usp.toString();
    let timeEntryUrl = `/api/redmine/conn/CONNECTIONID/time_entries?${qs}`

    const {
        data,
        isLoading,
        isValidating,
        error,
        mutate
    } = useSWR<TTimeEntries[]>(
        redmineConnections ? { url: timeEntryUrl, connections: redmineConnections } : null,
        fetchTimeEntriesWithConnection,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );
    console.log(data)
    return ( {
        data,
        isLoading,
        isValidating,
        error,
        mutate
    } );
}
 
export default useTimeEntriesRequest;