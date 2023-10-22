"use client";

import { UserRedmineConnection } from "@prisma/client"
import { TTimeEntries } from "@/types/index"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TimeEntry } from "@/lib/redmine";

interface HoursPerConnectionProps {
    redmineConnections: UserRedmineConnection[],
    timeEntries: TTimeEntries[] | undefined
}

interface HoursPerConnectionData {
    name: string,
    hours: number
}

const HoursPerConnection = ({
    redmineConnections,
    timeEntries
}: HoursPerConnectionProps) => {
    // console.log(redmineConnections)
    // console.log(timeEntries)

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    // Create an object to store the sum of hours for each connectionId
    let sumOfHoursByConnectionId: {
        name: string,
        hours: number
    }[] = [];

    // Iterate through the data and calculate the sum of hours for each connectionId
    if (timeEntries) {
        for (const entry of timeEntries) {
            const connectionId = entry.connectionId;
            const hoursData = entry.data;
            const sumOfHours = hoursData.reduce((total, entry) => total + entry.hours, 0);

            let matchedConns = redmineConnections?.filter(obj => {
                return obj?.id == connectionId
            });

            if (matchedConns) {
                const name = matchedConns[0].name
                sumOfHoursByConnectionId.push({
                    name: name,
                    hours: sumOfHours
                })
            }
        }
        // return <div></div>
        return (
            <div>
                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <PieChart width={300} height={300}>
                        <Pie
                            data={sumOfHoursByConnectionId}
                            // outerRadius={80}
                            fill="#8884d8"
                            dataKey="hours"
                            label
                            width={300}
                            height={300}
                        >
                            {sumOfHoursByConnectionId.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div>
                    {
                        redmineConnections?.map((conn: UserRedmineConnection) => {
                            const connectionId = conn.id;
                            let connTimeEntries = timeEntries?.filter(obj => {
                                return obj?.connectionId == connectionId
                            });
                            return (connTimeEntries != undefined) &&
                                <div key={conn.id} className="flex items-center p-2">
                                    <div className="ml-0 font-medium">
                                        <p className="text-sm font-medium leading-none">{conn?.name}</p>
                                        <p className="text-sm text-muted-foreground">{conn?.url}</p>
                                        <p className="text-sm text-muted-foreground">{conn?.username}</p>
                                    </div>
                                    <div className="ml-auto mt-0 font-medium">{connTimeEntries[0].data.reduce((a: number, { hours }: { hours: number }) => a + hours, 0)}</div>
                                </div>
                        })
                    }
                </div>
            </div>
        );
    }
}

export default HoursPerConnection