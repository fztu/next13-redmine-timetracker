"use client";

import axios from 'axios'
import useSWR from 'swr'
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import TimeEntryForm from '@/components/time-entry-form';

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const DashboardPage = () => {
    const { isSignedIn, user, isLoaded } = useUser();
    const { data: redmineConnections, isLoading, isValidating, error } = useSWR(
        '/api/redmine/conn?userId=' + user?.id ?? "",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    // If it's still loading the initial data, there is nothing to display.
    // We return a skeleton here.
    if (isLoading) {
        return (
            <div className="border border-blue-300 shadow rounded-md p-4 max-w-sm w-full mx-auto">
                <div className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                    <div className="flex-1 space-y-6 py-1">
                        <div className="h-2 bg-slate-200 rounded"></div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                                <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                            </div>
                            <div className="h-2 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (redmineConnections?.length === 0) {
        return (
            <div className="border bg-slate-300 border-blue-300 shadow rounded-md p-4 max-w-lg w-full mx-auto font-bold text-xl">
                <p className="p-4">No Redmine connection is configured.</p>
                <div className="p-4">
                    <Link
                        className="underline text-blue-500"
                        href="/connections"
                    >
                        Click here
                    </Link> to add Redmine connections.
                </div>

            </div>
        );
    }

    return (
        <>
            <div className="hidden flex-col md:flex">
                <div className="flex-1 space-y-4 p-6">
                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Time Tracker
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="w-full">
                                <TimeEntryForm 
                                    userRedmineConnections={redmineConnections}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

        </>

    );
}

export default DashboardPage;