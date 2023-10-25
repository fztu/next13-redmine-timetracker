"use client";

import { UserRedmineConnection } from "@prisma/client"
import { TTimeEntries } from "@/types/index"
import { Bar, BarChart, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Project as RedmineProject, TimeEntry } from '@/lib/redmine';
import { hoursToSeconds } from "date-fns";

interface HoursPerProjectProps {
    redmineConnections: UserRedmineConnection[],
    timeEntries: TTimeEntries[] | undefined
}



const HoursPerProject = ({
    redmineConnections,
    timeEntries
}: HoursPerProjectProps) => {
    const findProjectById= function (data: RedmineProject[], targetId: number) {
        for (const project of data) {
            if (project.id === targetId) {
                return project;
            } else if (project.children !== undefined && project.children.length > 0) {
                for (const childProject of project.children) {
                    if (childProject.id === targetId) {
                        return project;
                    }
                }
            }
        }
        return undefined;
    }

    // Create an array to store the sum of hours for each project (parent) as objects
    const sumOfHoursByProjectArray: { project: string, hours: number }[] = [];

    // Iterate through the data and calculate the sum of hours for each connectionId
    if (timeEntries) {
        // Iterate through the data and calculate the sum of hours for each day
        for (const entry of timeEntries) {
            const hoursData = entry.data;
            const connectionId = entry.connectionId;
            let matchedConns = redmineConnections?.filter(obj => {
                return obj?.id == connectionId
            });
            if (matchedConns) {
                const allProjects =  matchedConns[0].projects ? JSON.parse(matchedConns[0].projects) : [];
                for (const hourEntry of hoursData) {
                    let projectName = hourEntry.project.name;
                    const projectId = hourEntry.project.id;
                    const matchedProject = findProjectById(allProjects, projectId)
                    if (matchedProject !== undefined && matchedProject.id !== projectId) {
                        projectName = matchedProject.name
                    }
    
                    // Check if the date is already in the array, and if so, update the hours; otherwise, add a new entry
                    const existingDayIndex = sumOfHoursByProjectArray.findIndex((item) => item.project === projectName);
                    if (existingDayIndex !== -1) {
                        sumOfHoursByProjectArray[existingDayIndex].hours += hourEntry.hours;
                    } else {
                        sumOfHoursByProjectArray.push({ project: projectName, hours: hourEntry.hours });
                    }
                }
            }
            
            
        }
    }

    // Sort the array by hours desc
    sumOfHoursByProjectArray.sort((a, b) => {
        
        if (a.hours < b.hours) return 1;
        if (a.hours > b.hours) return -1;
        
        return 0;
    });

    if (sumOfHoursByProjectArray.length > 0) {
        return (
            <div>
                <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                    <BarChart
                        width={500}
                        height={400}
                        data={sumOfHoursByProjectArray}
                        layout="vertical"
                    >
                        <XAxis type="number" />
                        <YAxis type="category" width={150} fontSize={10} textAnchor="end" dataKey="project"/>
                        <Bar height={400} label={{ fill: "#ffffff" }} dataKey="hours" fill="#0088FE" />
                        <Tooltip />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
}

export default HoursPerProject