import axios from 'axios'
import useSWR from 'swr'
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";

import { UserRedmineConnection } from '@prisma/client';

/**
 * Fetches data from the specified URL using the Axios library.
 * @param {string} url - The URL to fetch data from.
 * @returns A Promise that resolves to the fetched data.
 */
const fetcher = (url: string) => axios.get(url).then(res => res.data)

/**
 * Custom hook that fetches the Redmine connections for the currently signed-in user.
 * @returns An object containing the fetched data, loading state, validation state, error, and a mutate function.
 */
const useRedmineConnectionsRequest = () => {
    const { isSignedIn, user, isLoaded } = useUser();

    const {
        data,
        isLoading,
        isValidating,
        error,
        mutate
    } = useSWR<UserRedmineConnection[]>(
        '/api/redmine/conn?userId=' + user?.id ?? "",
        fetcher,
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
 
export default useRedmineConnectionsRequest;