"use client"

import moment from 'moment';
import useSWR from 'swr';
import axios from 'axios';
import { DateRange } from "react-day-picker";
import { addDays } from 'date-fns';
import { useUser } from '@clerk/nextjs';

import { TTimeEntries } from "@/types/index";
import { UserRedmineConnection } from '@prisma/client';

/**
 * Fetches time entries from multiple Redmine connections using the provided URL.
 * @param {Object} params - The parameters for fetching time entries.
 * @param {string} params.url - The URL to fetch the time entries from. The string 'CONNECTIONID' will be replaced with the actual connection ID.
 * @param {UserRedmineConnection[]} params.connections - An array of Redmine connections to fetch time entries from.
 * @returns {Promise<TTimeEntries[]>} - A promise that resolves to an array of time entries, each containing the connection ID and the fetched data.
 */
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

/**
 * Custom hook that fetches time entries from the server based on the provided date range and Redmine connections.
 * @param {DateRange | undefined} date - The date range to filter the time entries.
 * @param {UserRedmineConnection[] | undefined} redmineConnections - The Redmine connections to fetch time entries from.
 * @returns An object containing the fetched time entries, loading state, validation state, error, and a mutate function.
 */
const useTimeEntriesRequest = (
    date: DateRange | undefined,
    redmineConnections: UserRedmineConnection[] | undefined
) => {
    const { isSignedIn, user, isLoaded } = useUser();

    console.log(date);
    let params = {
        "userId": user?.id ?? "",
        "from": date?.from ? moment(date.from).toISOString(true).split('T')[0] : moment(addDays(new Date(), -7)).toISOString(true).split('T')[0],
        "to": date?.to ? moment(date.to).toISOString(true).split('T')[0] : moment().toISOString(true).split('T')[0]
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
    // console.log(data)
    return ( {
        data,
        isLoading,
        isValidating,
        error,
        mutate
    } );
}
 
export default useTimeEntriesRequest;