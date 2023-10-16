"use client";

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import axios from 'axios'
import useSWR from 'swr'
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { addDays, format } from "date-fns"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import TimeEntryForm from '@/components/time-entry-form';
import CalendarDateRangePicker from '@/components/date-range-picker';
import { Button } from '@/components/ui/button';
import { UserRedmineConnection } from '@prisma/client';
import HoursSummary from '@/components/hours-summary';
import TimeEntriesTable from '@/components/time-entries-table';

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const DashboardPage = () => {
    const { isSignedIn, user, isLoaded } = useUser();
    const [calendarDate, setCalendarDate] = useState<DateRange | undefined>({
        from: addDays(new Date(), -28),
        to: new Date(),
    })
    const [date, setDate] = useState<DateRange | undefined>({
        from: addDays(new Date(), -28),
        to: new Date(),
    })

    const {
        data: redmineConnections,
        isLoading: isRedmineConnectionsLoading,
        isValidating: isRedmineConnectionsValidating,
        error: redmineConnectionsError
    } = useSWR(
        '/api/redmine/conn?userId=' + user?.id ?? "",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    const handleDateRefresh = () => {
        setDate(calendarDate);
    }

    // If it's still loading the initial data, there is nothing to display.
    // We return a skeleton here.
    if (isRedmineConnectionsLoading) {
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
            <div className="flex-col md:flex">
                <div className="flex-1 space-y-4 p-2">
                    <div className="flex items-center justify-between space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                        <div className="flex items-center space-x-2">
                            <CalendarDateRangePicker
                                date={calendarDate}
                                setDate={setCalendarDate}
                            />
                            <Button
                                onClick={handleDateRefresh}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4">
                        {(redmineConnections?.length > 0) &&
                            <Card className="h-fit col-span-1">
                                <CardHeader className="p-4">
                                    <CardTitle>Hours Summary</CardTitle>
                                    {(date) && 
                                        <CardDescription>
                                            Hours logged from {date?.from?.toISOString().split('T')[0]} to {date?.to?.toISOString().split('T')[0]}
                                        </CardDescription>
                                    }
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    {redmineConnections?.map((conn: UserRedmineConnection) => (
                                        <HoursSummary 
                                            key={conn.id}
                                            date={date}
                                            redmineConnection={conn}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        }
                        <Card className="col-span-2">
                            <CardHeader className="p-4">
                                <CardTitle>
                                    Time Tracker
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="w-full p-4 pt-0">
                                <TimeEntryForm
                                    userRedmineConnections={redmineConnections}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    {redmineConnections?.map((conn: UserRedmineConnection) => (
                        <TimeEntriesTable 
                            key={conn.id}
                            date={date}
                            redmineConnection={conn}
                        />
                    ))}
                </div>
            </div>

        </>

    );
}

export default DashboardPage;