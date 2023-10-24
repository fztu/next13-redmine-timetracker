import axios from 'axios'
import useSWR from 'swr'
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";

import { UserRedmineConnection } from '@prisma/client';

const fetcher = (url: string) => axios.get(url).then(res => res.data)

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

    console.log(data)
    return ( {
        data,
        isLoading,
        isValidating,
        error,
        mutate
    } );
}
 
export default useRedmineConnectionsRequest;