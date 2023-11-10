"use client";

import { UserRedmineConnection } from "@prisma/client"
import { TTimeEntries } from "@/types/index"
import { Bar, BarChart, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TimeEntry } from "@/lib/redmine";

interface HoursPerWeekProps {
    redmineConnections: UserRedmineConnection[],
    timeEntries: TTimeEntries[] | undefined
}

const HoursPerWeek = ({
    redmineConnections,
    timeEntries
}: HoursPerWeekProps) => {
    // Create an array to store the sum of hours for each week as objects
    const sumOfHoursByWeekArray: { week: string, hours: number }[] = [];

    // Iterate through the data and calculate the sum of hours for each connectionId
    if (timeEntries) {
        // Iterate through the data and calculate the sum of hours for each week
        for (const entry of timeEntries) {
            const hoursData = entry.data;

            for (const hourEntry of hoursData) {
                const spentOnDate = new Date(hourEntry.spent_on);
                const weekStartDate = new Date(spentOnDate);
                weekStartDate.setDate(spentOnDate.getDate() - spentOnDate.getDay());

                // Format the week start date as a string (YYYY-MM-DD)
                const weekStartString = weekStartDate.toISOString().split('T')[0];

                // Check if the week is already in the array, and if so, update the hours; otherwise, add a new entry
                const existingWeekIndex = sumOfHoursByWeekArray.findIndex((item) => item.week === weekStartString);
                if (existingWeekIndex !== -1) {
                    sumOfHoursByWeekArray[existingWeekIndex].hours += hourEntry.hours;
                } else {
                    sumOfHoursByWeekArray.push({ week: weekStartString, hours: hourEntry.hours });
                }
            }
        }
    }
    if (sumOfHoursByWeekArray.length > 0) {
        // return <></>
        return (
            <div>
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart
                        width={500}
                        height={300}
                        data={sumOfHoursByWeekArray}
                        // layout="vertical"
                    >
                        <XAxis type="category" fontSize={10} height={100} angle={-45} textAnchor="end" dataKey="week"/>
                        <YAxis type="number"  />
                        <Bar height={300} label={{ fill: "#ffffff" }} dataKey="hours" fill="#0088FE" />
                        <Tooltip />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    } 
}

export default HoursPerWeek