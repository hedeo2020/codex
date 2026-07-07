import {NextResponse} from "next/server";import {cookies} from "next/headers";import {getSession} from "@/lib/session";import {audit} from "@/lib/audit";
export async function POST(){const s=await getSession();if(s)await audit({actorUserId:s.userId,action:"LOGOUT",entityType:"User",entityId:s.userId});(await cookies()).delete("attendance_session");return NextResponse.json({ok:true})}
