"use client";

import { UserRedmineConnection } from "@prisma/client"
import { TTimeEntries } from "@/types/index"
import { Bar, BarChart, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TimeEntry } from "@/lib/redmine";

interface HoursPerDateProps {
    redmineConnections: UserRedmineConnection[],
    timeEntries: TTimeEntries[] | undefined
}

const HoursPerDate = ({
    redmineConnections,
    timeEntries
}: HoursPerDateProps) => {
    // Create an array to store the sum of hours for each day as objects
    const sumOfHoursByDayArray: { date: string, hours: number }[] = [];
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Iterate through the data and calculate the sum of hours for each connectionId
    if (timeEntries) {
        // Iterate through the data and calculate the sum of hours for each day
        for (const entry of timeEntries) {
            const hoursData = entry.data;

            for (const hourEntry of hoursData) {
                const spentOnDate = new Date(hourEntry.spent_on);
                const dayOfWeek = spentOnDate.getDay();
                const abbreviatedDayName = dayNames[dayOfWeek];

                // Format the date as a string (YYYY-MM-DD)
                const dayString = spentOnDate.toISOString().split('T')[0] + ` (${abbreviatedDayName})`;

                // Check if the date is already in the array, and if so, update the hours; otherwise, add a new entry
                const existingDayIndex = sumOfHoursByDayArray.findIndex((item) => item.date === dayString);
                if (existingDayIndex !== -1) {
                    sumOfHoursByDayArray[existingDayIndex].hours += hourEntry.hours;
                } else {
                    sumOfHoursByDayArray.push({ date: dayString, hours: hourEntry.hours });
                }
            }
        }
        // Sort the array by date
        sumOfHoursByDayArray.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            if (dateA < dateB) return 1;
            if (dateA > dateB) return -1;
            
            return 0;
        });
    }
    if (sumOfHoursByDayArray.length > 0) {
        // return <></>
        return (
            <div>
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart
                        width={500}
                        height={300}
                        data={sumOfHoursByDayArray}
                        layout="vertical"
                    >
                        <XAxis type="number"  />
                        <YAxis type="category" width={150} fontSize={10} textAnchor="end" dataKey="date"/>
                        <Bar height={300} label={{ fill: "#ffffff" }} dataKey="hours" fill="#0088FE" />
                        <Tooltip />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
}

export default HoursPerDate