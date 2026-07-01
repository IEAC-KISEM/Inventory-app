import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Shield, BookOpen, AlertTriangle } from "lucide-react"

// Simple Animated Counter component
function AnimatedCounter({ to }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (to === 0) {
      setCount(0)
      return
    }
    let start = 0
    const duration = 800
    const step = Math.max(1, Math.floor(to / 30))
    const intervalTime = Math.floor(duration / (to / step || 1))
    
    const timer = setInterval(() => {
      start += step
      if (start >= to) {
        setCount(to)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, intervalTime)

    return () => clearInterval(timer)
  }, [to])

  return <span>{count}</span>
}

export default function DashboardView({ instruments }) {
  const totalCount = instruments.length
  const bookedCount = instruments.filter(i => i.status === "booked").length
  const dueCount = instruments.filter(i => {
    if (!i.nextCalibrationDate) return false
    const dueMs = new Date(i.nextCalibrationDate) - new Date()
    return dueMs >= 0 && dueMs < 7 * 24 * 3600 * 1000
  }).length

  const recentInstruments = instruments.slice(0, 12)

  const isDueSoon = (dateStr) => {
    if (!dateStr) return false
    const dueMs = new Date(dateStr) - new Date()
    return dueMs >= 0 && dueMs < 7 * 24 * 3600 * 1000
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Quick performance statistics and activity updates.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-primary group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Instruments</CardTitle>
            <Shield className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedCounter to={totalCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Registered in warehouse</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-amber-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Booked Instruments</CardTitle>
            <BookOpen className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedCounter to={bookedCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently in use by team</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-destructive group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due for Calibration</CardTitle>
            <AlertTriangle className="w-5 h-5 text-destructive group-hover:scale-110 transition-transform animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">
              <AnimatedCounter to={dueCount} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Due within the next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Details Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Instruments</CardTitle>
          <CardDescription>A list of recently tracked instruments in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">SNo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInstruments.map((it, idx) => {
                  const urgent = isDueSoon(it.nextCalibrationDate)
                  return (
                    <TableRow 
                      key={it.id || idx} 
                      className={urgent ? "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-950/20 dark:hover:bg-red-950/30" : ""}
                    >
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{it.name}</div>
                        {urgent && (
                          <div className="text-[10px] text-destructive font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Calibration Due Soon
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{it.model || "N/A"}</TableCell>
                      <TableCell className="font-mono text-xs">{it.serial || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={it.status === "available" ? "success" : "warning"}
                          className="capitalize"
                        >
                          {it.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {recentInstruments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No instruments registered yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
